import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import {
  GENERIC_AUTH_ERROR,
  friendlyAuthError,
  looksLikeEmail,
} from "../src/components/auth/authMessages";
import { sanitizeInternalRedirectPath } from "../src/utils/redirectPath";

test("auth failures map to short messages without provider text", () => {
  for (const code of [
    "auth/invalid-email",
    "auth/too-many-requests",
    "auth/network-request-failed",
    "auth/user-disabled",
    "auth/user-not-found",
    "auth/invalid-action-code",
    "auth/expired-action-code",
  ]) {
    const message = friendlyAuthError({ code, message: `Firebase: Error (${code}).` });
    expect(message).not.toContain("Firebase");
    expect(message).not.toContain("auth/");
    expect(message).not.toBe(GENERIC_AUTH_ERROR);
  }
  expect(friendlyAuthError({ code: "auth/something-new", message: "Firebase: raw" })).toBe(
    GENERIC_AUTH_ERROR
  );
  expect(friendlyAuthError(new Error("raw provider text"))).toBe(GENERIC_AUTH_ERROR);
  expect(looksLikeEmail("person@example.com")).toBe(true);
  expect(looksLikeEmail("not-an-email")).toBe(false);
});

test("sign-in return paths stay inside the app", () => {
  expect(sanitizeInternalRedirectPath("/chat?intent=x", "/tools")).toBe("/chat?intent=x");
  for (const hostile of ["https://evil.example", "//evil.example", "/\\evil.example", "chat"]) {
    expect(sanitizeInternalRedirectPath(hostile, "/tools")).toBe("/tools");
  }
});

test("desktop header opens the dedicated sign-up and sign-in pages", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/");

  const header = page.locator("div.sticky").first();
  await header.getByRole("link", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/signup$/);
  await expect(page.getByRole("heading", { level: 1, name: "Create your account" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Show password" })).toBeVisible();

  await header.getByRole("link", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { level: 1, name: "Welcome back" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Forgot password?" })).toBeVisible();
});

test("mobile menu offers the same auth pages", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  await page.getByRole("button", { name: "Open menu" }).click();
  const menu = page.getByRole("dialog", { name: "Menu" });
  await expect(menu.getByRole("link", { name: "Create account" })).toBeVisible();
  await menu.getByRole("link", { name: "Sign in" }).click();

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { level: 1, name: "Welcome back" })).toBeVisible();
});

test("signed-out pages do not prefetch protected routes", async ({ page }) => {
  const prefetched: string[] = [];
  page.on("request", (request) => {
    const { pathname } = new URL(request.url());
    if (request.headers()["next-router-prefetch"] && /^\/(chat|tools|history|account)/.test(pathname)) {
      prefetched.push(pathname);
    }
  });
  await page.goto("/");
  await page.getByRole("heading", { name: "Start from a use case, not a blank page." }).scrollIntoViewIfNeeded();
  await page.waitForTimeout(1500);
  expect(prefetched).toEqual([]);

  for (const file of ["src/components/Header.tsx", "src/components/Home.tsx"]) {
    expect(readFileSync(file, "utf8")).toContain("<ProtectedLink");
  }
});

test("sign-out lives in one helper", () => {
  const helper = readFileSync("src/hooks/useSignOut.ts", "utf8");
  expect(helper).toContain("await signOut(auth);");
  for (const file of [
    "src/components/Header.tsx",
    "src/components/Footer.tsx",
    "src/components/AuthDataDisplay.tsx",
    "src/components/DeleteAccount.tsx",
    "src/components/auth/useAuthSession.ts",
  ]) {
    const source = readFileSync(file, "utf8");
    expect(source).not.toContain("signOut(auth)");
    expect(source).toMatch(/useSignOut|signOutUser/);
  }
});
