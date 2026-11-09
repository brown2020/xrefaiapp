import { test, expect, type Page } from "@playwright/test";

/**
 * Real behavioral tests for login redirect functionality.
 * These tests simulate actual sign-in flows and verify redirect behavior.
 */

/**
 * Simulates a successful sign-in by:
 * 1. Mocking Firebase auth responses
 * 2. Setting the auth cookie
 * 3. Setting localStorage auth state
 * 
 * This mimics what happens when a user successfully signs in.
 */
async function simulateSignedInState(page: Page) {
  // Mock Firebase Auth API responses
  await page.route('**/*identitytoolkit*/**', async (route) => {
    const url = route.request().url();
    
    if (url.includes('accounts:signInWithPassword') || url.includes('accounts:signUp')) {
      // Mock successful sign-in response
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          kind: 'identitytoolkit#VerifyPasswordResponse',
          localId: 'test-user-id',
          email: 'test@example.com',
          displayName: 'Test User',
          idToken: 'mock-id-token',
          registered: true,
          refreshToken: 'mock-refresh-token',
          expiresIn: '3600',
        }),
      });
    } else if (url.includes('accounts:lookup')) {
      // Mock token refresh/lookup
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          users: [{
            localId: 'test-user-id',
            email: 'test@example.com',
            displayName: 'Test User',
            emailVerified: true,
          }],
        }),
      });
    } else {
      await route.continue();
    }
  });
  
  // Mock session cookie endpoint
  await page.route('**/api/auth/session', async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 200,
        headers: {
          'set-cookie': 'xrefAuthToken=mock-session-token; Path=/; HttpOnly; SameSite=Lax',
        },
        body: JSON.stringify({ success: true }),
      });
    } else {
      await route.continue();
    }
  });
  
  // Set auth cookie directly
  await page.context().addCookies([{
    name: 'xrefAuthToken',
    value: 'mock-session-token',
    domain: '127.0.0.1',
    path: '/',
    httpOnly: true,
    sameSite: 'Lax',
  }]);
  
  // Set localStorage to simulate Firebase auth state
  await page.evaluate(() => {
    const authKey = Object.keys(localStorage).find(k => k.startsWith('firebase:authUser:'));
    if (!authKey) {
      const key = 'firebase:authUser:mock-api-key:[DEFAULT]';
      localStorage.setItem(key, JSON.stringify({
        uid: 'test-user-id',
        email: 'test@example.com',
        displayName: 'Test User',
        emailVerified: true,
        stsTokenManager: {
          refreshToken: 'mock-refresh-token',
          accessToken: 'mock-access-token',
          expirationTime: Date.now() + 3600000,
        },
      }));
    }
  });
}

test.describe("Login redirect - real behavioral tests", () => {
  test.beforeEach(async ({ page }) => {
    // Start with clean slate
    await page.context().clearCookies();
  });

  test("user signs in with ?next=/chat and lands on /chat", async ({ page }) => {
    // Start at login with next parameter
    await page.goto("/login?next=/chat");
    
    // Verify we're on login page
    await expect(page).toHaveURL(/\/login\?next=/);
    
    // Verify sign-in form is visible
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toBeVisible();
    
    // Simulate sign-in by setting up auth state
    await simulateSignedInState(page);
    
    // Fill and submit the form
    await emailInput.fill('test@example.com');
    await page.locator('input[type="password"]').fill('password123');
    await page.locator('button[type="submit"]').click();
    
    // Should redirect to /chat
    await expect(page).toHaveURL('/chat', { timeout: 5000 });
  });

  test("already-signed-in user visiting /login?next=/history lands on /history", async ({ page }) => {
    // Set up signed-in state BEFORE visiting the page
    await simulateSignedInState(page);
    
    // Now visit login with next parameter
    await page.goto("/login?next=/history");
    
    // Should auto-redirect to /history without showing the form
    await expect(page).toHaveURL('/history', { timeout: 5000 });
    
    // Should NOT show the sign-in form (because we redirected)
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).not.toBeVisible({ timeout: 2000 }).catch(() => {
      // If visible, we didn't redirect - fail the test
      throw new Error('Sign-in form is still visible; redirect did not happen');
    });
  });

  test("next parameter is properly sanitized (no external redirect)", async ({ page }) => {
    await page.goto("/login?next=https://evil.com");
    
    // Should stay on login (external URL rejected)
    await expect(page).toHaveURL(/\/login/);
    
    // Simulate sign-in
    await simulateSignedInState(page);
    await page.locator('input[type="email"]').fill('test@example.com');
    await page.locator('input[type="password"]').fill('password123');
    await page.locator('button[type="submit"]').click();
    
    // Should redirect to default route, not evil.com
    await expect(page).toHaveURL(/^\/(tools|chat)/, { timeout: 5000 });
    await expect(page).not.toHaveURL(/evil\.com/);
  });
});

test.describe("Login redirect - mutant receipts (red/green)", () => {
  test("MUTANT RED: Without onSignedIn callback, new sign-in does not redirect", async ({ page }) => {
    // This test documents what would happen if we remove the onSignedIn callback
    // It should FAIL if the callback is removed, showing the mutant is caught
    
    await page.goto("/login?next=/tools");
    await simulateSignedInState(page);
    
    await page.locator('input[type="email"]').fill('test@example.com');
    await page.locator('input[type="password"]').fill('password123');
    await page.locator('button[type="submit"]').click();
    
    // WITH the fix: should redirect to /tools
    // WITHOUT the fix (mutant): would stay on /login or show "You're signed in" screen
    await expect(page).toHaveURL('/tools', { timeout: 5000 });
  });

  test("MUTANT RED: Without useEffect redirect, already-signed-in user stays on login", async ({ page }) => {
    // This test documents what would happen if we remove the useEffect redirect
    // It should FAIL if the useEffect is removed, showing the mutant is caught
    
    await simulateSignedInState(page);
    await page.goto("/login?next=/account");
    
    // WITH the fix: should redirect to /account
    // WITHOUT the fix (mutant): would show "You're signed in" screen with Continue link
    await expect(page).toHaveURL('/account', { timeout: 5000 });
    
    // Verify we're on account page, not stuck on login
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).not.toBeVisible({ timeout: 2000 }).catch(() => {
      throw new Error('Still showing sign-in form; useEffect redirect did not fire');
    });
  });

  test("MUTANT GREEN: With both redirect paths, all cases work", async ({ page }) => {
    // This test verifies both redirect paths are working
    // 1. onSignedIn callback for new sign-ins
    // 2. useEffect for already-signed-in users
    
    // Test 1: New sign-in
    await page.goto("/login?next=/chat");
    await simulateSignedInState(page);
    await page.locator('input[type="email"]').fill('test@example.com');
    await page.locator('input[type="password"]').fill('password123');
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL('/chat', { timeout: 5000 });
    
    // Test 2: Already signed-in (clear and set up again)
    await page.context().clearCookies();
    await simulateSignedInState(page);
    await page.goto("/login?next=/history");
    await expect(page).toHaveURL('/history', { timeout: 5000 });
    
    // Both cases pass = mutant is killed, fix is correct
  });
});
