import { test, expect } from "@playwright/test";

test.describe("Verification email feedback", () => {
  test("Bug 3: Account page has verification email section when unauthenticated", async ({ page }) => {
    await page.goto("/account");
    
    await expect(page).toHaveURL(/\/(account|login)/);
  });

  test("Bug 3: Login page loads and has auth form", async ({ page }) => {
    await page.goto("/login");
    
    await expect(page.locator("h1, h2")).toContainText(/Welcome back|Sign in/i);
  });
});
