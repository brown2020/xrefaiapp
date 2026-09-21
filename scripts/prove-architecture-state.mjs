/**
 * Signs in through the production client, switches accounts, and checks that
 * the credits badge matches the Firestore ledger after a chat debit and an
 * aborted chat refund. Uses Firebase emulators and a local model fixture.
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
let activeProjectId = "demo-xref";
const appPort = 3321;
const openaiPort = 3333;
const authPort = 9099;
const firestorePort = 8080;
const base = `http://127.0.0.1:${appPort}`;
const logPath = "/tmp/app-eval-xrefai/architecture-state.json";
const emuDir = "/tmp/xref-emu";
const children = [];
const log = [];

function note(step, detail) {
  log.push({ step, detail, at: new Date().toISOString() });
  console.log(`${step}: ${detail}`);
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
      fs.appendFileSync(
        "/tmp/app-eval-xrefai/architecture-openai.log",
        `hit wait=${body.includes("WAIT_STREAM")} bytes=${body.length}\n`
      );
      const slow = true;
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

function writeEmulatorConfig() {
  fs.mkdirSync(emuDir, { recursive: true });
  fs.writeFileSync(
    path.join(emuDir, "firestore.rules"),
    "rules_version = '2';\nservice cloud.firestore {\n  match /databases/{database}/documents {\n    match /{document=**} {\n      allow read, write: if false;\n    }\n  }\n}\n"
  );
  fs.writeFileSync(
    path.join(emuDir, "firebase.json"),
    JSON.stringify(
      {
        emulators: {
          auth: { host: "127.0.0.1", port: authPort },
          firestore: { host: "127.0.0.1", port: firestorePort, rules: "firestore.rules" },
          ui: { enabled: false },
        },
      },
      null,
      2
    )
  );
}

function spawnLogged(command, args, env, logFile) {
  const child = spawn(command, args, {
    cwd: command === "npm" ? root : emuDir,
    env,
    stdio: ["ignore", "pipe", "pipe"],
  });
  const target = fs.createWriteStream(logFile, { flags: "w" });
  child.stdout.pipe(target);
  child.stderr.pipe(target);
  children.push(child);
  return child;
}

function shutdown() {
  for (const child of children) {
    if (!child.killed) child.kill("SIGTERM");
  }
}

async function waitFor(url, attempts = 80) {
  for (let i = 0; i < attempts; i += 1) {
    try {
      const response = await fetch(url);
      if (response.ok || response.status === 404) return;
    } catch {
      // retry
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`timed out waiting for ${url}`);
}

async function run(command, args, env) {
  await new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: root, env, stdio: "inherit" });
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(" ")} exited ${code}`));
    });
  });
}

async function ledgerCredits(uid) {
  const url = `http://127.0.0.1:${firestorePort}/v1/projects/${activeProjectId}/databases/(default)/documents/users/${uid}/profile/userData`;
  const response = await fetch(url, { headers: { Authorization: "Bearer owner" } });
  if (!response.ok) {
    return { credits: null, status: response.status };
  }
  const body = await response.json();
  const raw = body.fields?.credits?.integerValue ?? body.fields?.credits?.doubleValue;
  return { credits: raw === undefined ? null : Number(raw), status: response.status };
}

async function waitForLedger(uid, expected) {
  let last = { credits: null, status: 0 };
  for (let attempt = 0; attempt < 30; attempt += 1) {
    last = await ledgerCredits(uid);
    if (last.credits === expected) return last.credits;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`ledger stayed ${last.credits} status ${last.status}, expected ${expected}`);
}

async function accountId(page) {
  const cookies = await page.context().cookies();
  const token = cookies.find((cookie) => cookie.name === "xrefAuthToken")?.value;
  if (!token) throw new Error("missing auth cookie");
  const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf8"));
  const uid = payload.user_id || payload.sub;
  if (!uid) throw new Error("auth cookie has no uid");
  return uid;
}

async function badgeText(page) {
  const badge = page.getByLabel(/Credits balance/);
  await badge.waitFor({ timeout: 20_000 });
  return (await badge.innerText()).replace(/\s+/g, " ").trim();
}

function clientProjectId() {
  const rootStatic = path.join(root, ".next/static");
  const files = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith(".js")) files.push(full);
    }
  };
  walk(rootStatic);
  for (const file of files) {
    const text = fs.readFileSync(file, "utf8");
    if (!text.includes("xrefAuthEmulator")) continue;
    const match = text.match(/projectId:"([^"]+)"/);
    if (match?.[1]) return match[1];
  }
  throw new Error("client bundle is missing the firebase project id");
}

async function signUp(page, email) {
  await page.goto(base);
  await page.getByRole("button", { name: "Sign In to Enable Your Account" }).click();
  await page.getByRole("button", { name: "Create account" }).click();
  await page.locator("#auth-name").fill("Ada Lovelace");
  await page.locator("#auth-email").fill(email);
  await page.locator("#auth-password").fill("correct-horse");
  await page.locator("button[type=submit]").click();
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const cookies = await page.context().cookies();
    if (cookies.some((cookie) => cookie.name === "xrefAuthToken" && cookie.value)) break;
    if (attempt === 39) throw new Error("missing auth cookie");
    await page.waitForTimeout(250);
  }
  return badgeText(page);
}

async function main() {
  const openai = await startOpenAi();
  writeEmulatorConfig();
  if (process.env.SKIP_ARCH_BUILD === "1") {
    note("build", "reused the current production build");
  } else {
    note("build", "production client with loopback emulator opt-in");
    await run("npm", ["run", "build"], process.env);
  }
  activeProjectId = clientProjectId();

  const serverEnv = {
    ...process.env,
    FIREBASE_PROJECT_ID: activeProjectId,
    FIRESTORE_EMULATOR_HOST: `127.0.0.1:${firestorePort}`,
    FIREBASE_AUTH_EMULATOR_HOST: `127.0.0.1:${authPort}`,
    OPENAI_BASE_URL: `http://127.0.0.1:${openaiPort}/v1`,
    OPENAI_API_KEY: "fixture-openai-key",
  };

  spawnLogged(
    "firebase",
    ["emulators:start", "--only", "auth,firestore", "--project", activeProjectId],
    { ...process.env, PATH: process.env.PATH },
    "/tmp/app-eval-xrefai/architecture-emu.log"
  );
  spawnLogged(
    "npm",
    ["run", "start", "--", "--hostname", "127.0.0.1", "--port", String(appPort)],
    serverEnv,
    "/tmp/app-eval-xrefai/architecture-next.log"
  );

  await waitFor(`http://127.0.0.1:${authPort}/`);
  await waitFor(`http://127.0.0.1:${firestorePort}/`);
  await waitFor(base);
  note("ready", `next on ${appPort}`);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.addInitScript(() => {
    localStorage.setItem("xrefAuthEmulator", "127.0.0.1:9099");
    localStorage.setItem("xrefFirestoreEmulator", "127.0.0.1:8080");
  });
  page.on("response", (response) => {
    if (response.url().includes("/api/auth/session")) {
      note("session", String(response.status()));
    }
  });
  const stamp = Date.now();
  const emailA = `arch-a-${stamp}@example.test`;
  const emailB = `arch-b-${stamp}@example.test`;

  const started = await signUp(page, emailA);
  const uidA = await accountId(page);
  const ledgerStart = await waitForLedger(uidA, 1000);
  note("account-a", `badge "${started}" ledger ${ledgerStart}`);
  if (!started.includes("1,000") || ledgerStart !== 1000) {
    throw new Error(`starter cache mismatch badge ${started} ledger ${ledgerStart}`);
  }

  const abortResult = await page.evaluate(async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 300);
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", parts: [{ type: "text", text: "WAIT_STREAM" }] }],
          idempotencyKey: "arch-abort-1",
        }),
        signal: controller.signal,
      });
      const text = await response.text();
      return `${response.status} ${text.slice(0, 180)}`;
    } catch (error) {
      return error instanceof Error ? error.name : "error";
    } finally {
      clearTimeout(timer);
    }
  });
  note("abort-result", abortResult);
  if (abortResult !== "AbortError") {
    throw new Error(`interrupted chat was not aborted: ${abortResult}`);
  }
  const badgeAfterAbort = await badgeText(page);
  const ledgerAfterAbort = await waitForLedger(uidA, 1000);
  note("abort-refund", `badge "${badgeAfterAbort}" ledger ${ledgerAfterAbort}`);
  if (!badgeAfterAbort.includes("1,000") || ledgerAfterAbort !== 1000) {
    throw new Error(`refund cache mismatch badge ${badgeAfterAbort} ledger ${ledgerAfterAbort}`);
  }

  await page.goto(`${base}/chat`);
  await page.getByPlaceholder("Ask me anything...").fill("Say hello from the architecture proof");
  await page.getByRole("button", { name: "Send message" }).click();
  const badge975 = page.getByLabel(/Credits balance: 975/);
  try {
    await badge975.waitFor({ timeout: 12_000 });
  } catch {
    note("chat-ui", "badge stayed put after send; reloading to reconcile");
    await page.reload();
    await badge975.waitFor({ timeout: 20_000 });
  }
  const badgeAfterChat = await badgeText(page);
  const ledgerAfterChat = await waitForLedger(uidA, 975);
  note("chat-debit", `badge "${badgeAfterChat}" ledger ${ledgerAfterChat}`);
  if (!badgeAfterChat.includes("975") || ledgerAfterChat !== 975) {
    throw new Error(`debit cache mismatch badge ${badgeAfterChat} ledger ${ledgerAfterChat}`);
  }

  await page.getByRole("button", { name: "Sign out" }).click();
  await page.getByRole("button", { name: "Sign In to Enable Your Account" }).waitFor();
  const switched = await signUp(page, emailB);
  const uidB = await accountId(page);
  const ledgerB = await waitForLedger(uidB, 1000);
  const ledgerA = await waitForLedger(uidA, 975);
  note("account-switch", `B badge "${switched}" ledger ${ledgerB}; A ledger ${ledgerA}`);
  if (!switched.includes("1,000") || ledgerB !== 1000 || ledgerA !== 975) {
    throw new Error(`switch mismatch B ${switched}/${ledgerB} A ${ledgerA}`);
  }

  await browser.close();
  openai.close();
  shutdown();
  fs.writeFileSync(logPath, JSON.stringify({ ok: true, log }, null, 2));
  console.log(`wrote ${logPath}`);
}

main().catch((error) => {
  note("failed", error instanceof Error ? error.stack || error.message : String(error));
  fs.mkdirSync("/tmp/app-eval-xrefai", { recursive: true });
  fs.writeFileSync(logPath, JSON.stringify({ ok: false, log }, null, 2));
  shutdown();
  process.exit(1);
});
