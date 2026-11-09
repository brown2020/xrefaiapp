import { test, expect } from "@playwright/test";

/**
 * Security headers verification.
 * Tests that frame protection and other security headers are properly set.
 */

test.describe("Security headers", () => {
  test("frame protection headers are set site-wide", async ({ page }) => {
    // Test on public page
    const response = await page.goto("/");
    expect(response).not.toBeNull();
    
    const headers = response!.headers();
    
    // Frame protection
    expect(headers["x-frame-options"]).toBe("SAMEORIGIN");
    expect(headers["content-security-policy"]).toContain("frame-ancestors 'self'");
    
    // Other security headers
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    expect(headers["strict-transport-security"]).toContain("max-age=63072000");
    expect(headers["permissions-policy"]).toContain("camera=()");
  });

  test("frame protection headers are set on protected routes", async ({ page, context }) => {
    // Set auth cookie to access protected route
    await context.addCookies([{
      name: 'xrefAuthToken',
      value: 'test-token',
      domain: '127.0.0.1',
      path: '/',
      httpOnly: true,
      sameSite: 'Lax',
    }]);
    
    const response = await page.goto("/tools");
    expect(response).not.toBeNull();
    
    const headers = response!.headers();
    
    // Frame protection
    expect(headers["x-frame-options"]).toBe("SAMEORIGIN");
    expect(headers["content-security-policy"]).toContain("frame-ancestors 'self'");
  });

  test("frame protection headers are set on login page", async ({ page }) => {
    const response = await page.goto("/login");
    expect(response).not.toBeNull();
    
    const headers = response!.headers();
    
    // Frame protection
    expect(headers["x-frame-options"]).toBe("SAMEORIGIN");
    expect(headers["content-security-policy"]).toContain("frame-ancestors 'self'");
  });
});
