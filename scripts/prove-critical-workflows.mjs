/**
 * Runs the frozen critical tasks through Next routes and server actions
 * against the Firebase emulators and a local model fixture.
 * Does not call paid providers or the production project.
 */
import { spawn } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const projectId = "demo-xref";
const appPort = 3320;
const openaiPort = 3331;
const receiptPort = 3332;
const authPort = 9099;
const firestorePort = 8080;
const base = `http://127.0.0.1:${appPort}`;
const iapSecret = "fixture-iap-secret";
const logPath = "/tmp/app-eval-xrefai/critical-workflows.json";
const emuDir = "/tmp/xref-emu";

const children = [];
const log = [];

function note(step, detail) {
  log.push({ step, detail, at: new Date().toISOString() });
  console.log(`${step}: ${detail}`);
}

function signIap(fields) {
  const canonical = JSON.stringify({
    transactionId: String(fields.transactionId),
    productId: String(fields.productId),
    amount: Number(fields.amount),
    currency: String(fields.currency).toUpperCase(),
    platform: String(fields.platform),
    credits: Number(fields.credits),
    ts: Number(fields.ts),
    receipt: String(fields.receipt),
  });
  return crypto.createHmac("sha256", iapSecret).update(canonical).digest("hex");
}

function listen(server, port) {
  return new Promise((resolve) => {
    server.listen(port, "127.0.0.1", resolve);
  });
}

function startOpenAi() {
  const server = http.createServer((req, res) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => {
      const body = Buffer.concat(chunks).toString("utf8");
      fs.appendFileSync("/tmp/app-eval-xrefai/openai-bodies.log", `${body.slice(0, 400)}\n---\n`);
      const slow = body.includes("WAIT_STREAM");
      const write = () => {
        if (!res.headersSent) {
          res.writeHead(200, { "content-type": "text/event-stream" });
        }
        res.write(
          `data: ${JSON.stringify({
            type: "response.output_text.delta",
            item_id: "item_1",
            delta: "Local fixture reply.",
          })}\n\n`
        );
        res.write(
          `data: ${JSON.stringify({
            type: "response.completed",
            response: { usage: { input_tokens: 1, output_tokens: 4 } },
          })}\n\n`
        );
        res.end();
      };
      if (slow) {
        res.writeHead(200, { "content-type": "text/event-stream" });
        setTimeout(write, 4000);
      } else {
        write();
      }
    });
  });
  return listen(server, openaiPort).then(() => server);
}

function startReceipts() {
  const server = http.createServer((req, res) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => {
      const body = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
      const expected = `valid:${body.productId}:${body.transactionId}`;
      const ok = body.receipt === expected;
      const payload = ok
        ? {
            status: 0,
            receipt: {
              in_app: [
                { product_id: body.productId, transaction_id: body.transactionId },
              ],
            },
          }
        : { status: 21003 };
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify(payload));
    });
  });
  return listen(server, receiptPort).then(() => server);
}

function writeEmulatorConfig() {
  fs.mkdirSync(emuDir, { recursive: true });
  fs.writeFileSync(
    path.join(emuDir, "firestore.rules"),
    `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
`
  );
  fs.writeFileSync(
    path.join(emuDir, "firebase.json"),
    JSON.stringify(
      {
        firestore: { rules: "firestore.rules" },
        emulators: {
          auth: { host: "127.0.0.1", port: authPort },
          firestore: { host: "127.0.0.1", port: firestorePort },
          ui: { enabled: false },
        },
      },
      null,
      2
    )
  );
}

function spawnLogged(command, args, env) {
  const child = spawn(command, args, {
    cwd: root,
    env,
    stdio: ["ignore", "pipe", "pipe"],
  });
  children.push(child);
  return child;
}

function waitFor(child, pattern, timeoutMs) {
  return new Promise((resolve, reject) => {
    let buffer = "";
    const timer = setTimeout(() => {
      reject(new Error(`Timed out waiting for ${pattern}`));
    }, timeoutMs);
    const onData = (chunk) => {
      buffer += chunk.toString();
      if (buffer.includes(pattern)) {
        clearTimeout(timer);
        resolve(buffer);
      }
    };
    child.stdout.on("data", onData);
    child.stderr.on("data", onData);
    child.on("exit", (code) => {
      clearTimeout(timer);
      reject(new Error(`Process exited ${code} before ${pattern}`));
    });
  });
}

async function waitHttp(url, timeoutMs) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.status < 500) return;
    } catch {
      // server still starting
    }
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  throw new Error(`Timed out waiting for ${url}`);
}

async function signUp(email) {
  const response = await fetch(
    `http://127.0.0.1:${authPort}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email,
        password: "proof-password-1",
        returnSecureToken: true,
      }),
    }
  );
  const body = await response.json();
  if (!response.ok) throw new Error(`Auth emulator sign-up failed: ${response.status}`);
  return { uid: body.localId, idToken: body.idToken };
}

async function sessionCookie(idToken) {
  const response = await fetch(`${base}/api/auth/session`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ idToken }),
  });
  if (!response.ok) {
    throw new Error(`Session route returned ${response.status}`);
  }
  const setCookie = response.headers.getSetCookie?.() ?? [];
  const raw = setCookie.find((value) => value.startsWith("xrefAuthToken="));
  if (!raw) throw new Error("Session route did not set xrefAuthToken");
  return raw.split(";")[0];
}

function actionIds() {
  const manifest = JSON.parse(
    fs.readFileSync(path.join(root, ".next/server/server-reference-manifest.json"), "utf8")
  );
  const ids = {};
  for (const [id, value] of Object.entries(manifest.node)) {
    ids[value.exportedName] = id;
  }
  return ids;
}

async function callAction(cookie, page, actionId, args) {
  const client = await import(
    "../node_modules/next/dist/compiled/react-server-dom-webpack/cjs/react-server-dom-webpack-client.node.production.js"
  );
  const encodeReply = client.encodeReply;
  const body = await encodeReply(args);
  const response = await fetch(`${base}${page}`, {
    method: "POST",
    headers: {
      accept: "text/x-component",
      "content-type": "text/plain;charset=UTF-8",
      "next-action": actionId,
      cookie,
    },
    body,
    redirect: "manual",
  });
  const text = await response.text();
  return { status: response.status, text };
}

async function profileCredits(uid) {
  const url =
    `http://127.0.0.1:${firestorePort}/v1/projects/${projectId}` +
    `/databases/(default)/documents/users/${uid}/profile/userData`;
  const response = await fetch(url, { headers: { authorization: "Bearer owner" } });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Firestore read failed: ${response.status}`);
  const body = await response.json();
  const raw = body.fields?.credits?.integerValue ?? body.fields?.credits?.doubleValue;
  return raw === undefined ? null : Number(raw);
}

async function chat(cookie, { text, idempotencyKey, signal }) {
  return fetch(`${base}/api/chat`, {
    method: "POST",
    headers: { "content-type": "application/json", cookie },
    body: JSON.stringify({
      messages: [{ role: "user", parts: [{ type: "text", text }] }],
      idempotencyKey,
      useCredits: true,
      modelKey: "openai:gpt-5.4",
    }),
    signal,
  });
}

function shutdown() {
  for (const child of children) {
    if (!child.killed) child.kill("SIGTERM");
  }
}

async function main() {
  writeEmulatorConfig();
  const openai = await startOpenAi();
  const receipts = await startReceipts();
  const emulator = spawnLogged(
    "firebase",
    [
      "emulators:start",
      "--only",
      "auth,firestore",
      "--project",
      projectId,
      "--config",
      path.join(emuDir, "firebase.json"),
    ],
    { ...process.env, CI: "1" }
  );
  await waitFor(emulator, "All emulators ready", 120_000);
  note("emulators", "auth and firestore ready");

  const serverEnv = {
    ...process.env,
    FIREBASE_PROJECT_ID: projectId,
    FIRESTORE_EMULATOR_HOST: `127.0.0.1:${firestorePort}`,
    FIREBASE_AUTH_EMULATOR_HOST: `127.0.0.1:${authPort}`,
    OPENAI_BASE_URL: `http://127.0.0.1:${openaiPort}/v1`,
    OPENAI_API_KEY: "fixture-openai-key",
    IAP_WEBVIEW_SECRET: iapSecret,
    IAP_RECEIPT_VERIFY_URL: `http://127.0.0.1:${receiptPort}/verify`,
    NEXT_PUBLIC_COOKIE_NAME: "xrefAuthToken",
  };
  const nextServer = spawnLogged(
    "npm",
    ["run", "start", "--", "--hostname", "127.0.0.1", "--port", String(appPort)],
    serverEnv
  );
  const nextLog = fs.createWriteStream("/tmp/app-eval-xrefai/proof-next.log");
  nextServer.stdout.pipe(nextLog);
  nextServer.stderr.pipe(nextLog);
  await waitHttp(`${base}/`, 60_000);
  note("next", `listening on ${base}`);

  const ids = actionIds();
  const home = await fetch(`${base}/`);
  const homeText = await home.text();
  if (home.status !== 200 || !homeText.includes('id="starter-paths"')) {
    throw new Error(`public starter page failed: ${home.status}`);
  }
  note("public-starter", "GET / returned the starter paths");

  const gated = await fetch(`${base}/chat`, { redirect: "manual" });
  if (gated.status !== 307 && gated.status !== 302) {
    throw new Error(`route gate expected redirect, got ${gated.status}`);
  }
  const deniedChat = await fetch(`${base}/api/chat`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ messages: [{ role: "user", parts: [{ type: "text", text: "hi" }] }] }),
  });
  if (deniedChat.status !== 401) {
    throw new Error(`unauthenticated chat expected 401, got ${deniedChat.status}`);
  }
  note("route-gate", `GET /chat redirected ${gated.status}; POST /api/chat denied 401`);

  const userA = await signUp(`critical-a-${Date.now()}@example.com`);
  const cookieA = await sessionCookie(userA.idToken);
  const created = await callAction(cookieA, "/account", ids.fetchProfileServer, []);
  if (created.status !== 200 || created.text.includes("AUTH_REQUIRED")) {
    throw new Error(`profile create failed: ${created.status} ${created.text.slice(0, 240)}`);
  }
  const starter = await profileCredits(userA.uid);
  if (starter !== 1000) throw new Error(`starter grant expected 1000, got ${starter}`);
  note("profile", `starter balance ${starter}`);

  const chatResponse = await chat(cookieA, {
    text: "Say hello",
    idempotencyKey: "chat-success-1",
  });
  if (!chatResponse.ok) {
    throw new Error(`chat failed ${chatResponse.status} ${await chatResponse.text()}`);
  }
  const chatBody = await chatResponse.text();
  if (!chatBody.includes("Local fixture reply.")) {
    throw new Error("chat stream did not include the fixture reply");
  }
  const afterChat = await profileCredits(userA.uid);
  if (afterChat !== 975) throw new Error(`chat debit expected 975, got ${afterChat}`);
  const reloaded = await callAction(cookieA, "/account", ids.fetchProfileServer, []);
  if (!reloaded.text.includes("975")) {
    throw new Error("reload of profile did not show the debited balance");
  }
  note("chat-generation", "streamed through POST /api/chat and reload showed 975");

  const duplicate = await chat(cookieA, {
    text: "Say hello again",
    idempotencyKey: "chat-success-1",
  });
  if (duplicate.status !== 409) {
    throw new Error(`duplicate chat expected 409, got ${duplicate.status}`);
  }
  if ((await profileCredits(userA.uid)) !== 975) {
    throw new Error("duplicate chat changed the balance");
  }
  note("duplicate", "same chat idempotency key returned 409 and did not debit again");

  const abortController = new AbortController();
  const slow = chat(cookieA, {
    text: "WAIT_STREAM",
    idempotencyKey: "chat-abort-1",
    signal: abortController.signal,
  });
  const abortTimer = setTimeout(() => abortController.abort(), 200);
  try {
    const response = await slow;
    const text = await response.text();
    throw new Error(`interrupted chat completed ${response.status} ${text.slice(0, 300)}`);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("interrupted chat completed")) {
      throw error;
    }
    const aborted =
      error instanceof Error &&
      (error.name === "AbortError" || error.message.toLowerCase().includes("aborted"));
    if (!aborted) throw error;
  } finally {
    clearTimeout(abortTimer);
  }
  await new Promise((resolve) => setTimeout(resolve, 1000));
  if ((await profileCredits(userA.uid)) !== 975) {
    throw new Error(`aborted chat did not refund, balance ${await profileCredits(userA.uid)}`);
  }
  note("interrupted", "aborted chat refunded the 25 credit debit");

  const [first, second] = await Promise.all([
    chat(cookieA, { text: "parallel one", idempotencyKey: "chat-race-1" }),
    chat(cookieA, { text: "parallel two", idempotencyKey: "chat-race-1" }),
  ]);
  const statuses = [first.status, second.status].sort();
  if (statuses[0] !== 200 || statuses[1] !== 409) {
    throw new Error(`concurrent chat statuses ${statuses.join(",")}`);
  }
  await first.text();
  await second.text();
  if ((await profileCredits(userA.uid)) !== 950) {
    throw new Error(`concurrent chat balance expected 950, got ${await profileCredits(userA.uid)}`);
  }
  note("concurrent", "one of two simultaneous chats was charged");

  const writing = await callAction(cookieA, "/tools", ids.generateResponse, [
    "You are a fixture.",
    "Write one sentence.",
    { requestedWordCount: 40, idempotencyKey: "writing-1", modelKey: "openai:gpt-5.4" },
  ]);
  if (writing.status !== 200) {
    throw new Error(`writing action status ${writing.status} ${writing.text.slice(0, 300)}`);
  }
  const afterWriting = await profileCredits(userA.uid);
  if (afterWriting !== 925) {
    throw new Error(`writing debit expected 925, got ${afterWriting}`);
  }
  const writingReload = await callAction(cookieA, "/account", ids.fetchProfileServer, []);
  if (!writingReload.text.includes("925")) {
    throw new Error("reload did not show the writing debit");
  }
  note("writing-tool", "generateResponse debited 25 credits and reload showed 925");

  const pack = { productId: "starter", credits: 1100, amount: 1000 };
  const receipt = `valid:${pack.productId}:tx-success-1`;
  const purchase = {
    transactionId: "tx-success-1",
    productId: pack.productId,
    amount: pack.amount,
    currency: "USD",
    platform: "ios",
    credits: pack.credits,
    ts: Date.now(),
    receipt,
  };
  const granted = await callAction(cookieA, "/account", ids.confirmIapPurchase, [
    { ...purchase, signature: signIap(purchase) },
  ]);
  if (granted.status !== 200 || !granted.text.includes("1100")) {
    throw new Error(`IAP grant failed ${granted.status} ${granted.text.slice(0, 300)}`);
  }
  const afterPurchase = await profileCredits(userA.uid);
  if (afterPurchase !== 2025) {
    throw new Error(`purchase balance expected 2025, got ${afterPurchase}`);
  }
  const purchaseReload = await callAction(cookieA, "/account", ids.fetchProfileServer, []);
  if (!purchaseReload.text.includes("2025")) {
    throw new Error("reload did not show the purchased balance");
  }
  note("credit-purchase", "IAP server action granted 1100 and reload showed 2025");

  const replayTs = Date.now();
  const replay = { ...purchase, ts: replayTs };
  const again = await callAction(cookieA, "/account", ids.confirmIapPurchase, [
    { ...replay, signature: signIap(replay) },
  ]);
  if ((await profileCredits(userA.uid)) !== 2025 || !again.text.includes("alreadyProcessed")) {
    throw new Error(`replaying the same transaction granted again ${again.text.slice(0, 240)}`);
  }
  note("stale-replay", "same transaction id did not grant twice");

  const stale = {
    ...purchase,
    transactionId: "tx-stale-1",
    receipt: "valid:starter:tx-stale-1",
    ts: Date.now() - 10 * 60 * 1000,
  };
  await callAction(cookieA, "/account", ids.confirmIapPurchase, [
    { ...stale, signature: signIap(stale) },
  ]);
  if ((await profileCredits(userA.uid)) !== 2025) {
    throw new Error("stale timestamp granted credits");
  }
  note("stale-timestamp", "old IAP timestamp did not grant");

  const forged = {
    ...purchase,
    transactionId: "tx-forged-1",
    receipt: "not-a-store-receipt",
    ts: Date.now(),
  };
  await callAction(cookieA, "/account", ids.confirmIapPurchase, [
    { ...forged, signature: signIap(forged) },
  ]);
  if ((await profileCredits(userA.uid)) !== 2025) {
    throw new Error("signed payload with a rejected receipt granted credits");
  }
  note("receipt-denial", "HMAC plus a rejected receipt did not grant");

  const userB = await signUp(`critical-b-${Date.now()}@example.com`);
  const cookieB = await sessionCookie(userB.idToken);
  await callAction(cookieB, "/account", ids.fetchProfileServer, []);
  const crossTs = Date.now();
  const cross = { ...purchase, ts: crossTs };
  await callAction(cookieB, "/account", ids.confirmIapPurchase, [
    { ...cross, signature: signIap(cross) },
  ]);
  if ((await profileCredits(userB.uid)) !== 1000) {
    throw new Error("second user claimed the first user's transaction");
  }
  note("cross-user", "other account did not receive the claimed transaction");

  const broke = await fetch(
    `http://127.0.0.1:${firestorePort}/v1/projects/${projectId}/databases/(default)/documents/users/${userA.uid}/profile/userData?updateMask.fieldPaths=credits`,
    {
      method: "PATCH",
      headers: { "content-type": "application/json", authorization: "Bearer owner" },
      body: JSON.stringify({ fields: { credits: { integerValue: "0" } } }),
    }
  );
  if (!broke.ok) throw new Error("could not set a zero balance for the negative case");
  const poor = await chat(cookieA, { text: "no credits", idempotencyKey: "chat-poor-1" });
  if (poor.status !== 402) {
    throw new Error(`insufficient credits expected 402, got ${poor.status}`);
  }
  note("negative", "chat with a zero balance returned 402");

  openai.close();
  receipts.close();
  shutdown();
  const result = { ok: true, log };
  fs.mkdirSync(path.dirname(logPath), { recursive: true });
  fs.writeFileSync(logPath, JSON.stringify(result, null, 2));
  console.log(`wrote ${logPath}`);
}

main().catch((error) => {
  shutdown();
  const result = { ok: false, error: error instanceof Error ? error.message : String(error), log };
  fs.mkdirSync(path.dirname(logPath), { recursive: true });
  fs.writeFileSync(logPath, JSON.stringify(result, null, 2));
  console.error(result.error);
  process.exit(1);
});
