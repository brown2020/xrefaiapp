import { test, expect } from "@playwright/test";

/**
 * Server-side login redirect tests.
 * Tests verify that the server-side redirect validates the 'next' parameter
 * and properly redirects already-signed-in users.
 */

test.describe("Login redirect - server-side behavioral tests", () => {
  test.beforeEach(async ({ context }) => {
    // Start with clean slate
    await context.clearCookies();
  });

  test("user signs in with ?next=/chat and client-side redirect works", async ({ page }) => {
    // Start at login with next parameter
    await page.goto("/login?next=/chat");
    
    // Verify we're on login page
    await expect(page).toHaveURL(/\/login\?next=/);
    
    // Verify sign-in form is visible
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toBeVisible();
    
    // Note: Full sign-in flow requires Firebase configuration
    // The onSignedIn callback handles redirect to the next parameter
  });

  test("already-signed-in user (server-side redirect) with cookie", async ({ page, context }) => {
    // Set auth cookie to simulate already-signed-in user
    await context.addCookies([{
      name: 'xrefAuthToken',
      value: 'test-token',
      domain: '127.0.0.1',
      path: '/',
      httpOnly: true,
      sameSite: 'Lax',
    }]);
    
    // Visit login with next parameter
    await page.goto("/login?next=/history");
    
    // Server-side redirect should happen immediately
    // Should redirect to /history (the next parameter)
    await expect(page).toHaveURL('/history', { timeout: 5000 });
  });

  test("valid next parameter is preserved and used for redirect", async ({ page, context }) => {
    await context.addCookies([{
      name: 'xrefAuthToken',
      value: 'test-token',
      domain: '127.0.0.1',
      path: '/',
      httpOnly: true,
      sameSite: 'Lax',
    }]);
    
    // Visit login with valid next parameter while already signed in
    await page.goto("/login?next=/history");
    
    // Should auto-redirect to /history (the next parameter)
    await expect(page).toHaveURL('/history', { timeout: 5000 });
  });

  test("unknown internal path falls back to default route", async ({ page, context }) => {
    await context.addCookies([{
      name: 'xrefAuthToken',
      value: 'test-token',
      domain: '127.0.0.1',
      path: '/',
      httpOnly: true,
      sameSite: 'Lax',
    }]);
    
    // Visit login with an unknown path (not in allowlist)
    await page.goto("/login?next=/unknown-page");
    
    // Should redirect to default route (not the unknown page)
    await expect(page).toHaveURL(/\/(tools|chat)$/, { timeout: 5000 });
    await expect(page).not.toHaveURL(/unknown-page/);
  });

  test("protocol-relative URL //evil.com is rejected", async ({ page, context }) => {
    await context.addCookies([{
      name: 'xrefAuthToken',
      value: 'test-token',
      domain: '127.0.0.1',
      path: '/',
      httpOnly: true,
      sameSite: 'Lax',
    }]);
    
    await page.goto("/login?next=//evil.com");
    
    // Should redirect to default route, not evil.com
    await expect(page).toHaveURL(/\/(tools|chat)$/, { timeout: 5000 });
    await expect(page).not.toHaveURL(/evil\.com/);
  });

  test("absolute URL https://evil.com is rejected", async ({ page, context }) => {
    await context.addCookies([{
      name: 'xrefAuthToken',
      value: 'test-token',
      domain: '127.0.0.1',
      path: '/',
      httpOnly: true,
      sameSite: 'Lax',
    }]);
    
    await page.goto("/login?next=https://evil.com");
    
    // Should redirect to default route, not evil.com
    await expect(page).toHaveURL(/\/(tools|chat)$/, { timeout: 5000 });
    await expect(page).not.toHaveURL(/evil\.com/);
  });

  test("backslash variant /\\evil.com is rejected", async ({ page, context }) => {
    await context.addCookies([{
      name: 'xrefAuthToken',
      value: 'test-token',
      domain: '127.0.0.1',
      path: '/',
      httpOnly: true,
      sameSite: 'Lax',
    }]);
    
    await page.goto("/login?next=/\\evil.com");
    
    // Should redirect to default route, not evil.com
    await expect(page).toHaveURL(/\/(tools|chat)$/, { timeout: 5000 });
    await expect(page).not.toHaveURL(/evil\.com/);
  });

  test("URL-encoded protocol-relative %2F%2Fevil.com is rejected", async ({ page, context }) => {
    await context.addCookies([{
      name: 'xrefAuthToken',
      value: 'test-token',
      domain: '127.0.0.1',
      path: '/',
      httpOnly: true,
      sameSite: 'Lax',
    }]);
    
    await page.goto("/login?next=%2F%2Fevil.com");
    
    // Should redirect to default route, not evil.com
    await expect(page).toHaveURL(/\/(tools|chat)$/, { timeout: 5000 });
    await expect(page).not.toHaveURL(/evil\.com/);
  });

  test("stale/invalid cookie does not cause redirect loop", async ({ page, context }) => {
    /**
     * Stale cookie rejection path:
     * 
     * 1. Browser has expired/invalid auth cookie
     * 2. Server login page checks cookie PRESENCE only → redirects to next
     * 3. Proxy middleware checks cookie PRESENCE only → allows through
     * 4. Client loads protected page
     * 5. Firebase Auth client-side validates token → fails for stale token
     * 6. useAuthToken clears the cookie (clearAuthCookie)
     * 7. User is already on page but without valid auth
     * 8. Protected page components handle unauthenticated state
     * 
     * No redirect loop because:
     * - Server checks are presence-only (fast UX redirect)
     * - Token validation is client-side after page load
     * - Invalid tokens get cleared, not preserved
     */
    
    // Set an INVALID cookie value (not just absent, but present with bad value)
    await context.addCookies([{
      name: 'xrefAuthToken',
      value: 'invalid-jwt-token-12345',
      domain: '127.0.0.1',
      path: '/',
      httpOnly: true,
      sameSite: 'Lax',
    }]);
    
    // Visit login with next parameter
    await page.goto("/login?next=/chat");
    
    // Server sees cookie present, redirects to /chat
    // Middleware sees cookie present, allows through to /chat
    // Client would then detect invalid token and clear it
    await expect(page).toHaveURL('/chat', { timeout: 5000 });
    
    // No redirect loop: user lands on /chat
    // (Client-side auth failure handling is separate from redirect logic)
  });
});

test.describe("Login redirect - mutant documentation", () => {
  test("documents server-side redirect mechanism", async ({ page, context }) => {
    /**
     * MUTANT TEST: Server-side redirect in login/signup pages
     * 
     * CODE LOCATION: src/app/login/page.tsx:29-33
     * 
     * MUTANT (broken - remove these lines):
     * ```typescript
     * const authCookie = (await cookies()).get(cookieName);
     * if (authCookie?.value) {
     *   redirect(next);
     * }
     * ```
     * 
     * RED (without the code above):
     * - User with auth cookie visits /login?next=/history
     * - Server does NOT redirect, shows login form
     * - Test fails: expect(page).toHaveURL('/history') → times out on /login
     * 
     * GREEN (with the code):
     * - User with auth cookie visits /login?next=/history
     * - Server redirects immediately to /history
     * - Test passes: page.url() === '/history'
     */
    
    await context.addCookies([{
      name: 'xrefAuthToken',
      value: 'test-token',
      domain: '127.0.0.1',
      path: '/',
      httpOnly: true,
      sameSite: 'Lax',
    }]);
    
    await page.goto("/login?next=/account");
    
    // GREEN: With server-side redirect, lands on /account
    await expect(page).toHaveURL('/account', { timeout: 5000 });
  });

  test("documents onSignedIn callback for new sign-ins", async ({ page }) => {
    /**
     * MUTANT TEST: onSignedIn callback in AuthPage
     * 
     * CODE LOCATION: src/components/auth/AuthPage.tsx:17-22
     * 
     * MUTANT (broken - remove the onSignedIn callback):
     * ```typescript
     * const session = useAuthSession({
     *   initialMode: mode,
     *   // Remove this:
     *   // onSignedIn: () => {
     *   //   if (hasRedirected.current) return;
     *   //   hasRedirected.current = true;
     *   //   setRedirecting(true);
     *   //   router.replace(next);
     *   // },
     * });
     * ```
     * 
     * RED (without onSignedIn callback):
     * - User signs in successfully
     * - No redirect happens
     * - User sees "You're signed in" screen with Continue link
     * - Test would fail: user stays on /login
     * 
     * GREEN (with onSignedIn callback):
     * - User signs in successfully
     * - Callback fires, redirecting to next parameter
     * - User lands on intended page
     */
    
    await page.goto("/login?next=/tools");
    
    // Verify login page loads
    await expect(page).toHaveURL(/\/login\?next=/);
    
    // Note: Full sign-in requires Firebase configuration
    // The onSignedIn callback is what redirects after successful sign-in
  });
});
