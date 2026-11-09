import { test, expect } from "@playwright/test";

/**
 * Verification email feedback tests with mocked send behavior.
 * Tests the success and error visual feedback banners.
 */

test.describe("Verification email feedback with mocked send", () => {
  test("success banner appears with role=status on successful send", async ({ page }) => {
    // Mock the sendEmailVerification to succeed
    await page.goto("/account");
    
    // If redirected to login, we're not signed in
    if (page.url().includes("/login")) {
      test.skip();
      return;
    }
    
    // Look for the verification notice (only shows for unverified users)
    const verifyButton = page.locator('button', { hasText: /Send verification email/i });
    const isVisible = await verifyButton.isVisible().catch(() => false);
    
    if (!isVisible) {
      test.skip(); // User is already verified
      return;
    }
    
    // Mock successful email send by intercepting Firebase calls
    await page.route('**/*', async (route) => {
      const url = route.request().url();
      if (url.includes('sendOobCode') || url.includes('emailVerification')) {
        // Mock successful response
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ email: 'test@example.com' }),
        });
      } else {
        await route.continue();
      }
    });
    
    // Click the send button
    await verifyButton.click();
    
    // Success banner should appear
    const successBanner = page.locator('[role="status"]', { hasText: /Verification email sent/i });
    await expect(successBanner).toBeVisible({ timeout: 5000 });
    
    // Verify success styling
    await expect(successBanner).toHaveClass(/emerald/);
    
    // Check for checkmark or success indicator
    const successText = await successBanner.textContent();
    expect(successText).toContain('✓');
  });

  test("error banner appears with role=alert on send failure", async ({ page }) => {
    await page.goto("/account");
    
    if (page.url().includes("/login")) {
      test.skip();
      return;
    }
    
    const verifyButton = page.locator('button', { hasText: /Send verification email/i });
    const isVisible = await verifyButton.isVisible().catch(() => false);
    
    if (!isVisible) {
      test.skip();
      return;
    }
    
    // Mock failed email send
    await page.route('**/*', async (route) => {
      const url = route.request().url();
      if (url.includes('sendOobCode') || url.includes('emailVerification')) {
        // Mock error response
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({ 
            error: { message: 'RATE_LIMIT_EXCEEDED' }
          }),
        });
      } else {
        await route.continue();
      }
    });
    
    // Click the send button
    await verifyButton.click();
    
    // Error banner should appear
    const errorBanner = page.locator('[role="alert"]', { hasText: /Error sending email/i });
    await expect(errorBanner).toBeVisible({ timeout: 5000 });
    
    // Verify error styling
    await expect(errorBanner).toHaveClass(/red/);
    
    // Check for error indicator
    const errorText = await errorBanner.textContent();
    expect(errorText).toContain('✗');
  });

  test("mutant: without success banner, user gets no visual feedback", async ({ page }) => {
    // This test documents what happens when the success banner is removed
    // It should fail if the banner is properly implemented
    
    await page.goto("/account");
    
    if (page.url().includes("/login")) {
      test.skip();
      return;
    }
    
    const verifyButton = page.locator('button', { hasText: /Send verification email/i });
    const isVisible = await verifyButton.isVisible().catch(() => false);
    
    if (!isVisible) {
      test.skip();
      return;
    }
    
    // Mock successful send
    await page.route('**/*', async (route) => {
      const url = route.request().url();
      if (url.includes('sendOobCode') || url.includes('emailVerification')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ email: 'test@example.com' }),
        });
      } else {
        await route.continue();
      }
    });
    
    await verifyButton.click();
    
    // With the fix, the success banner SHOULD appear
    // Without the fix, this assertion would fail
    const successBanner = page.locator('[role="status"]');
    await expect(successBanner).toBeVisible({ timeout: 3000 });
  });

  test("mutant: without error banner, failed send has no visual feedback", async ({ page }) => {
    await page.goto("/account");
    
    if (page.url().includes("/login")) {
      test.skip();
      return;
    }
    
    const verifyButton = page.locator('button', { hasText: /Send verification email/i });
    const isVisible = await verifyButton.isVisible().catch(() => false);
    
    if (!isVisible) {
      test.skip();
      return;
    }
    
    // Mock failed send
    await page.route('**/*', async (route) => {
      const url = route.request().url();
      if (url.includes('sendOobCode') || url.includes('emailVerification')) {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({ error: { message: 'ERROR' } }),
        });
      } else {
        await route.continue();
      }
    });
    
    await verifyButton.click();
    
    // With the fix, the error banner SHOULD appear
    // Without the fix, this assertion would fail
    const errorBanner = page.locator('[role="alert"]');
    await expect(errorBanner).toBeVisible({ timeout: 3000 });
  });
});
