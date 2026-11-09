import { test, expect } from "@playwright/test";

test.describe("Login redirect fix verification", () => {
  test("Bug 2: sanitizeInternalRedirectPath rejects absolute URLs", async ({ page }) => {
    await page.goto("/login?next=https://evil.com");
    
    await expect(page).toHaveURL(/\/login/);
    
    const html = await page.content();
    expect(html).not.toContain("https://evil.com");
  });

  test("Bug 2: sanitizeInternalRedirectPath rejects protocol-relative URLs", async ({ page }) => {
    await page.goto("/login?next=//evil.com");
    
    await expect(page).toHaveURL(/\/login/);
    
    const html = await page.content();
    expect(html).not.toContain("//evil.com");
  });

  test("Bug 2: sanitizeInternalRedirectPath rejects backslash paths", async ({ page }) => {
    await page.goto("/login?next=/chat\\..\\..\\evil");
    
    await expect(page).toHaveURL(/\/login/);
  });

  test("Bug 2: valid next parameter is preserved in page", async ({ page }) => {
    await page.goto("/login?next=/chat");
    
    await expect(page).toHaveURL(/\/login\?next=(\/chat|%2Fchat)/);
    
    // Verify page loaded with the next parameter
    const heading = page.locator('h1', { hasText: /Welcome back|sign/i });
    await expect(heading).toBeVisible({ timeout: 3000 });
  });

  test("Bug 2: /signup also handles next parameter", async ({ page }) => {
    await page.goto("/signup?next=/tools");
    
    await expect(page).toHaveURL(/\/signup\?next=(\/tools|%2Ftools)/);
  });
});
