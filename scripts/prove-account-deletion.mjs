/**
 * Proves that deleteAccountServer removes everything a user owns, through the
 * real Next server action, against Auth, Firestore, and Storage emulators.
 * Needs `npm run build` first. Never touches the production project.
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const projectId = "demo-xref";
const bucket = `${projectId}.appspot.com`;
const appPort = 3321;
const authPort = 9199;
const firestorePort = 8180;
const storagePort = 9299;
const base = `http://127.0.0.1:${appPort}`;
const firestoreDocs = `http://127.0.0.1:${firestorePort}/v1/projects/${projectId}/databases/(default)/documents`;
const storageApi = `http://127.0.0.1:${storagePort}`;
const owner = { authorization: "Bearer owner" };
const emuDir = "/tmp/xref-deletion-emu";
const logDir = "/tmp/app-eval-xrefai";

const children = [];

function note(step, detail) {
  console.log(`${step}: ${detail}`);
}

function writeEmulatorConfig() {
  fs.mkdirSync(emuDir, { recursive: true });
  fs.mkdirSync(logDir, { recursive: true });
  const denyAll = "allow read, write: if false;";
  fs.writeFileSync(
    path.join(emuDir, "firestore.rules"),
    `rules_version = '2';\nservice cloud.firestore {\n  match /databases/{database}/documents {\n    match /{document=**} { ${denyAll} }\n  }\n}\n`
  );
  fs.writeFileSync(
    path.join(emuDir, "storage.rules"),
    `rules_version = '2';\nservice firebase.storage {\n  match /b/{bucket}/o {\n    match /{allPaths=**} { ${denyAll} }\n  }\n}\n`
  );
  fs.writeFileSync(
    path.join(emuDir, "firebase.json"),
    JSON.stringify(
      {
        firestore: { rules: "firestore.rules" },
        storage: { rules: "storage.rules" },
        emulators: {
          auth: { host: "127.0.0.1", port: authPort },
          firestore: { host: "127.0.0.1", port: firestorePort, websocketPort: 9169 },
          storage: { host: "127.0.0.1", port: storagePort },
          hub: { host: "127.0.0.1", port: 4469 },
          logging: { host: "127.0.0.1", port: 4569 },
          ui: { enabled: false },
        },
      },
      null,
      2
    )
  );
}

function spawnLogged(command, args, env) {
  const child = spawn(command, args, { cwd: root, env, stdio: ["ignore", "pipe", "pipe"] });
  children.push(child);
  return child;
}

function waitFor(child, pattern, timeoutMs) {
  return new Promise((resolve, reject) => {
    let buffer = "";
    const timer = setTimeout(() => reject(new Error(`Timed out waiting for ${pattern}`)), timeoutMs);
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
      if ((await fetch(url)).status < 500) return;
    } catch {
      // still starting
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
      body: JSON.stringify({ email, password: "proof-password-1", returnSecureToken: true }),
    }
  );
  const body = await response.json();
  if (!response.ok) throw new Error(`Auth emulator sign-up failed: ${response.status}`);
  return { uid: body.localId, idToken: body.idToken };
}

async function authUserExists(uid) {
  const response = await fetch(
    `http://127.0.0.1:${authPort}/identitytoolkit.googleapis.com/v1/projects/${projectId}/accounts:lookup`,
    {
      method: "POST",
      headers: { "content-type": "application/json", ...owner },
      body: JSON.stringify({ localId: [uid] }),
    }
  );
  const body = await response.json();
  return Array.isArray(body.users) && body.users.length > 0;
}

async function sessionCookie(idToken) {
  const response = await fetch(`${base}/api/auth/session`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ idToken }),
  });
  if (!response.ok) throw new Error(`Session route returned ${response.status}`);
  const raw = (response.headers.getSetCookie?.() ?? []).find((value) =>
    value.startsWith("xrefAuthToken=")
  );
  if (!raw) throw new Error("Session route did not set xrefAuthToken");
  return raw.split(";")[0];
}

function actionIds() {
  const manifest = JSON.parse(
    fs.readFileSync(path.join(root, ".next/server/server-reference-manifest.json"), "utf8")
  );
  const ids = {};
  for (const [id, value] of Object.entries(manifest.node)) ids[value.exportedName] = id;
  return ids;
}

async function callAction(cookie, actionId, args) {
  const client = await import(
    "../node_modules/next/dist/compiled/react-server-dom-webpack/cjs/react-server-dom-webpack-client.node.production.js"
  );
  const response = await fetch(`${base}/account`, {
    method: "POST",
    headers: {
      accept: "text/x-component",
      "content-type": "text/plain;charset=UTF-8",
      "next-action": actionId,
      cookie,
    },
    body: await client.encodeReply(args),
    redirect: "manual",
  });
  return { status: response.status, text: await response.text() };
}

async function putDoc(docPath, fields) {
  const response = await fetch(`${firestoreDocs}/${docPath}`, {
    method: "PATCH",
    headers: { "content-type": "application/json", ...owner },
    body: JSON.stringify({ fields }),
  });
  if (!response.ok) throw new Error(`Seed ${docPath} failed: ${response.status}`);
}

async function getDoc(docPath) {
  const response = await fetch(`${firestoreDocs}/${docPath}`, { headers: owner });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Read ${docPath} failed: ${response.status}`);
  return response.json();
}

async function subcollections(docPath) {
  const response = await fetch(`${firestoreDocs}/${docPath}:listCollectionIds`, {
    method: "POST",
    headers: { "content-type": "application/json", ...owner },
    body: "{}",
  });
  if (!response.ok) throw new Error(`listCollectionIds ${docPath} failed: ${response.status}`);
  return (await response.json()).collectionIds ?? [];
}

async function putFile(name) {
  const response = await fetch(
    `${storageApi}/upload/storage/v1/b/${bucket}/o?uploadType=media&name=${encodeURIComponent(name)}`,
    { method: "POST", headers: { "content-type": "image/jpeg", ...owner }, body: "fixture" }
  );
  if (!response.ok) throw new Error(`Seed file ${name} failed: ${response.status}`);
}

async function listFiles(prefix) {
  const response = await fetch(
    `${storageApi}/storage/v1/b/${bucket}/o?prefix=${encodeURIComponent(prefix)}`,
    { headers: owner }
  );
  if (!response.ok) throw new Error(`List ${prefix} failed: ${response.status}`);
  return ((await response.json()).items ?? []).map((item) => item.name);
}

async function seedUser(uid, tag) {
  const text = { stringValue: `${tag} fixture` };
  for (const docPath of [
    `users/${uid}/chats/c1`,
    `users/${uid}/summaries/s1`,
    `users/${uid}/payments/p1`,
    `users/${uid}/creditsLedger/l1`,
    `users/${uid}/idempotency/i1`,
    `users/${uid}/rateLimit/chat`,
    `users/${uid}/locks/payment_x`,
  ]) {
    await putDoc(docPath, { text });
  }
  await putDoc(`iapTransactions/tx_${tag}`, { uid: { stringValue: uid }, productId: { stringValue: "starter" } });
  await putFile(`users/${uid}/profile.png`);
  await putFile(`generated/${uid}/1_image.jpg`);
}

async function main() {
  writeEmulatorConfig();
  const emulator = spawnLogged(
    "firebase",
    ["emulators:start", "--only", "auth,firestore,storage", "--project", projectId, "--config", path.join(emuDir, "firebase.json")],
    { ...process.env, CI: "1" }
  );
  await waitFor(emulator, "All emulators ready", 120_000);
  note("emulators", "auth, firestore, and storage ready");

  const nextServer = spawnLogged(
    "npm",
    ["run", "start", "--", "--hostname", "127.0.0.1", "--port", String(appPort)],
    {
      ...process.env,
      FIREBASE_PROJECT_ID: projectId,
      FIRESTORE_EMULATOR_HOST: `127.0.0.1:${firestorePort}`,
      FIREBASE_AUTH_EMULATOR_HOST: `127.0.0.1:${authPort}`,
      FIREBASE_STORAGE_EMULATOR_HOST: `127.0.0.1:${storagePort}`,
      NEXT_PUBLIC_COOKIE_NAME: "xrefAuthToken",
    }
  );
  const nextLog = fs.createWriteStream(path.join(logDir, "deletion-next.log"));
  nextServer.stdout.pipe(nextLog);
  nextServer.stderr.pipe(nextLog);
  await waitHttp(`${base}/`, 60_000);
  note("next", `listening on ${base}`);

  const ids = actionIds();
  const stamp = Date.now();
  const target = await signUp(`delete-me-${stamp}@example.com`);
  const bystander = await signUp(`keep-me-${stamp}@example.com`);
  const targetCookie = await sessionCookie(target.idToken);
  const bystanderCookie = await sessionCookie(bystander.idToken);

  for (const [user, cookie] of [[target, targetCookie], [bystander, bystanderCookie]]) {
    const created = await callAction(cookie, ids.fetchProfileServer, []);
    if (created.status !== 200 || created.text.includes("AUTH_REQUIRED")) {
      throw new Error(`profile create failed: ${created.status}`);
    }
    await seedUser(user.uid, user === target ? "target" : "bystander");
  }
  const seeded = await subcollections(`users/${target.uid}`);
  note("seed", `target has ${seeded.sort().join(", ")} and 2 Storage files`);

  const deleted = await callAction(targetCookie, ids.deleteAccountServer, []);
  if (deleted.status !== 200 || /AUTH_REQUIRED|Error/.test(deleted.text.slice(0, 400))) {
    throw new Error(`deleteAccountServer failed: ${deleted.status} ${deleted.text.slice(0, 300)}`);
  }

  const leftovers = await subcollections(`users/${target.uid}`);
  if (leftovers.length) throw new Error(`Firestore leftovers: ${leftovers.join(", ")}`);
  const files = [
    ...(await listFiles(`users/${target.uid}/`)),
    ...(await listFiles(`generated/${target.uid}/`)),
  ];
  if (files.length) throw new Error(`Storage leftovers: ${files.join(", ")}`);
  const claim = await getDoc("iapTransactions/tx_target");
  if (!claim) throw new Error("IAP claim doc was removed; it must stay to block replay");
  if (claim.fields?.uid) throw new Error("IAP claim still holds the deleted uid");
  if (await authUserExists(target.uid)) throw new Error("Auth user still exists");
  note("deleted", "no Firestore subcollections, no Storage files, IAP claim anonymized, Auth user gone");

  const recreate = await callAction(targetCookie, ids.fetchProfileServer, []);
  if (await getDoc(`users/${target.uid}/profile/userData`)) {
    throw new Error(`stale session recreated the profile (status ${recreate.status})`);
  }
  // The Auth emulator rejects tokens of deleted users on its own; in production
  // the getUser() guard in fetchProfileServer is what stops this recreate.
  note("stale-session", "the deleted account's session cannot recreate a profile");

  const kept = await subcollections(`users/${bystander.uid}`);
  const keptFiles = await listFiles(`generated/${bystander.uid}/`);
  const keptClaim = await getDoc("iapTransactions/tx_bystander");
  if (kept.length < 7 || keptFiles.length !== 1 || keptClaim?.fields?.uid?.stringValue !== bystander.uid) {
    throw new Error("bystander data was changed");
  }
  if (!(await authUserExists(bystander.uid))) throw new Error("bystander Auth user was deleted");
  note("bystander", `other user keeps ${kept.length} subcollections, files, claim, and sign-in`);

  console.log("ACCOUNT DELETION PROOF PASSED");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    for (const child of children) if (!child.killed) child.kill("SIGTERM");
  });
