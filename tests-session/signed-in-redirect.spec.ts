import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { SESSION_AUTH_HOST, SESSION_FIRESTORE_HOST, SESSION_PROJECT_ID } from "./emulator";

const PASSWORD = "correct-horse-battery";
const HISTORY_PROMPT = "Please sign in to view your history.";

type TestUser = { uid: string; email: string; savedText: string };

async function createUser(label: string): Promise<TestUser> {
  const email = `${label}-${Date.now()}@example.test`;
  const signUp = await fetch(
    `http://${SESSION_AUTH_HOST}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-key`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password: PASSWORD, returnSecureToken: true }),
    }
  );
  expect(signUp.ok).toBe(true);
  const { localId: uid } = (await signUp.json()) as { localId: string };

  const savedText = `Tidal energy turns the motion of tides into electricity (${label}).`;
  const seeded = await fetch(
    `http://${SESSION_FIRESTORE_HOST}/v1/projects/${SESSION_PROJECT_ID}/databases/(default)/documents/users/${uid}/summaries?documentId=seed-1`,
    {
      method: "POST",
      headers: { "content-type": "application/json", authorization: "Bearer owner" },
      body: JSON.stringify({
        fields: {
          timestamp: { timestampValue: new Date().toISOString() },
          topic: { stringValue: "Tidal energy" },
          prompt: { stringValue: "Summarize tidal energy" },
          response: { stringValue: savedText },
          words: { stringValue: "120" },
          xrefs: { arrayValue: {} },
        },
      }),
    }
  );
  expect(seeded.ok).toBe(true);
  return { uid, email, savedText };
}

async function sessionCookie(context: BrowserContext): Promise<string | undefined> {
  return (await context.cookies()).find((cookie) => cookie.name === "xrefAuthToken")?.value || undefined;
}

async function signInWithForm(page: Page, user: TestUser) {
  await expect(page.getByRole("heading", { level: 1, name: "Welcome back" })).toBeVisible();
  await page.locator("#auth-email").fill(user.email);
  await page.locator("#auth-password").fill(PASSWORD);
  await page.locator("button[type=submit]").click();
}

/** New accounts must allow AI processing once; the choice persists on the profile. */
async function acceptAiConsent(page: Page) {
  const dialog = page.getByRole("dialog", { name: "Allow AI processing?" });
  await dialog.getByRole("button", { name: "Allow and continue" }).click();
  await expect(dialog).toBeHidden();
}

async function expectSignedInHistory(page: Page, user: TestUser) {
  await expect(page).toHaveURL(/\/history$/);
  await expect(page.getByText(user.savedText)).toBeVisible();
  await expect(page.getByRole("dialog", { name: "Allow AI processing?" })).toHaveCount(0);
  await expect(page.getByText(HISTORY_PROMPT)).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Sign out" }).first()).toBeVisible();
}

/** Counts main-frame navigations to /login after `start`, to catch redirect loops. */
function countLoginNavigations(page: Page) {
  let count = 0;
  page.on("framenavigated", (frame) => {
    if (frame === page.mainFrame() && new URL(frame.url()).pathname === "/login") count += 1;
  });
  return () => count;
}

test("signed-in visitor is redirected from /login and /signup to history, and sign-out shows the form", async ({
  page,
  context,
}) => {
  const user = await createUser("redirect");

  await page.goto("/login?next=/history");
  await signInWithForm(page, user);
  await expect(page).toHaveURL(/\/history$/);
  await acceptAiConsent(page);
  await expectSignedInHistory(page, user);
  expect(await sessionCookie(context)).toBeTruthy();

  for (const path of ["/login?next=/history", "/signup?next=/history"]) {
    await page.goto("/tools");
    const response = await page.goto(path);
    expect(response?.request().redirectedFrom()?.url()).toContain(path.split("?")[0]);
    await expectSignedInHistory(page, user);
  }

  await page.getByRole("button", { name: "Sign out" }).first().click();
  await expect.poll(() => sessionCookie(context)).toBeUndefined();

  const signedOut = await page.goto("/login?next=/history");
  expect(signedOut?.request().redirectedFrom()).toBeNull();
  await expect(page).toHaveURL(/\/login\?next=/);
  await expect(page.locator("#auth-email")).toBeVisible();

  // Signing in again in the same tab lands on history once, without bouncing
  // back to /login through a stale cached redirect.
  const loginNavigations = countLoginNavigations(page);
  await signInWithForm(page, user);
  await expectSignedInHistory(page, user);
  await page.waitForTimeout(2_000);
  await expect(page).toHaveURL(/\/history$/);
  expect(loginNavigations()).toBe(0);
});

test("a browser that kept the cookie but lost Firebase storage is signed out on both sides", async ({
  browser,
  page,
  context,
}) => {
  const user = await createUser("storage-lost");
  await page.goto("/login?next=/history");
  await signInWithForm(page, user);
  await expect(page).toHaveURL(/\/history$/);
  await acceptAiConsent(page);
  await expectSignedInHistory(page, user);

  // Cookies only, as when site storage is cleared or not carried over.
  const cookiesOnly = await browser.newContext({
    baseURL: test.info().project.use.baseURL,
    storageState: { cookies: await context.cookies(), origins: [] },
  });
  const restored = await cookiesOnly.newPage();
  const loginNavigations = countLoginNavigations(restored);

  await restored.goto("/login?next=/history");
  await expect(restored).toHaveURL(/\/history$/);
  await expect(restored.getByText(HISTORY_PROMPT)).toBeVisible();
  await expect(restored.getByRole("button", { name: "Sign out" })).toHaveCount(0);
  await expect.poll(() => sessionCookie(cookiesOnly)).toBeUndefined();

  await restored.getByText(HISTORY_PROMPT).locator("..").getByRole("link", { name: "Sign in" }).click();
  await expect(restored).toHaveURL(/\/login\?next=%2Fhistory$/);
  await expect(restored.locator("#auth-email")).toBeVisible();
  await restored.waitForTimeout(2_000);
  await expect(restored).toHaveURL(/\/login\?next=%2Fhistory$/);
  expect(loginNavigations()).toBe(1);

  await restored.goto("/login?next=/history");
  await expect(restored).toHaveURL(/\/login\?next=/);
  await expect(restored.locator("#auth-email")).toBeVisible();
  await cookiesOnly.close();
});
