import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import {
  GENERIC_AUTH_ERROR,
  friendlyAuthError,
  looksLikeEmail,
} from "../src/components/auth/authMessages";

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

test("desktop header offers sign in and create account when signed out", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/");

  const header = page.locator("div.sticky").first();
  await expect(header.getByRole("link", { name: "Sign in" })).toBeVisible();
  await header.getByRole("link", { name: "Create account" }).click();

  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading", { name: "Create your account" })).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Show password" })).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(page).toHaveURL(/\/$/);
  await header.getByRole("link", { name: "Sign in" }).click();
  await expect(page.getByRole("dialog").getByRole("heading", { name: "Welcome back" })).toBeVisible();
  await expect(page.getByRole("dialog").getByRole("button", { name: "Forgot password?" })).toBeVisible();
});

test("mobile menu offers the same auth entry points", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  await page.getByRole("button", { name: "Open menu" }).click();
  const menu = page.getByRole("dialog", { name: "Menu" });
  await expect(menu.getByRole("link", { name: "Create account" })).toBeVisible();
  await menu.getByRole("link", { name: "Sign in" }).click();

  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
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

test("a direct sign-up link opens the create account form", async ({ page }) => {
  await page.goto("/?auth=signup");
  await expect(page.getByRole("heading", { name: "Create your account" })).toBeVisible();
});
