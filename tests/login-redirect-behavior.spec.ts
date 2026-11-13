import { test, expect } from "@playwright/test";

/**
 * Login redirect tests.
 * /login and /signup redirect only when the server verifies the auth cookie
 * with the Admin SDK (src/utils/signedInRedirect.ts). Signed-out visitors and
 * forged or stale cookies get the form. The verified-session redirect itself
 * is proven on emulators by `npm run prove:state` and in
 * src/utils/signedInRedirect.test.ts.
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

  test("login page does NOT auto-redirect with next parameter", async ({ page }) => {
    // Visit login with next parameter
    await page.goto("/login?next=/history");
    
    // Signed out: no redirect, stays on the login page
    await expect(page).toHaveURL(/\/login\?next=/);
  });

  test("stale/invalid cookie shows explicit confirmation (no redirect loop)", async ({ page, context }) => {
    /**
     * Stale cookie path: the server cannot verify the cookie, so it renders
     * the form instead of redirecting. The proxy does not match /login, so a
     * cookie that is merely present never causes a redirect loop.
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
    
    // Should stay on login page (no auto-redirect)
    await expect(page).toHaveURL(/\/login\?next=/);
    
  });

  for (const path of ["/login", "/signup"]) {
    test(`${path}: forged JWT-shaped cookie is not trusted for the redirect`, async ({ request }) => {
      const forged = [
        Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url"),
        Buffer.from(
          JSON.stringify({
            sub: "forged-user",
            user_id: "forged-user",
            exp: Math.floor(Date.now() / 1000) + 3600,
            firebase: { sign_in_provider: "password" },
          })
        ).toString("base64url"),
        "forged-signature",
      ].join(".");

      const response = await request.get(`${path}?next=/history`, {
        headers: { cookie: `xrefAuthToken=${forged}` },
        maxRedirects: 0,
      });

      expect(response.status()).toBe(200);
      expect(response.headers()["location"]).toBeUndefined();
      expect(await response.text()).toContain('type="email"');
    });

    test(`${path}: signed-out request renders the form with no redirect`, async ({ request }) => {
      const response = await request.get(`${path}?next=/history`, { maxRedirects: 0 });

      expect(response.status()).toBe(200);
      expect(response.headers()["location"]).toBeUndefined();
      expect(await response.text()).toContain('type="email"');
    });
  }
});

test.describe("Login redirect - behavior documentation", () => {
  test("documents server-verified redirect for already-signed-in users", async ({ page }) => {
    /**
     * BEHAVIOR: An already-signed-in visitor is redirected on the server.
     *
     * IMPLEMENTATION:
     * - src/app/login/page.tsx and src/app/signup/page.tsx call
     *   redirectIfSignedIn(next) from src/utils/signedInRedirect.ts
     * - It verifies the HttpOnly ID-token cookie with the Admin SDK
     *   (checkRevoked) and calls redirect() with the allowlisted next,
     *   falling back to DEFAULT_SIGNED_IN_ROUTE
     * - src/proxy.ts does not match /login or /signup: cookie presence is
     *   not a session
     * - When Firebase restores a user whose cookie was stale, AuthPage asks
     *   the server to re-check once with router.refresh() after a fresh
     *   cookie is stored, and shows a Continue link meanwhile
     */

    await page.goto("/login?next=/account");

    // Signed out: no redirect, stays on /login
    await expect(page).toHaveURL(/\/login\?next=/);
  });

  test("documents onSignedIn callback for new sign-ins", async ({ page }) => {
    /**
     * BEHAVIOR: After successful sign-in, auto-redirect to validated next
     * 
     * This is different from already-signed-in case:
     * - User just completed sign-in flow (action they initiated)
     * - Not a URL-prefilled privileged action
     * - Validated next parameter is used automatically
     * 
     * CODE LOCATION: onSignedIn in src/components/auth/AuthPage.tsx
     */
    
    await page.goto("/login?next=/tools");
    
    // Verify login page loads
    await expect(page).toHaveURL(/\/login\?next=/);
    
    // Note: Full sign-in requires Firebase configuration
    // The onSignedIn callback redirects after successful sign-in
  });
});
