import { expect, test, type BrowserContext } from "@playwright/test";

const AUTH_COOKIE_NAME = "xrefAuthToken";
const SOFT_AUTH_COOKIE_VALUE = "playwright-soft-auth";

const protectedRoutes = [
  "/chat",
  "/tools",
  "/history",
  "/account",
  "/payment-attempt",
  "/payment-success",
] as const;

const publicRoutes = [
  "/",
  "/about",
  "/privacy",
  "/terms",
  "/support",
  "/loginfinish",
] as const;

async function addSoftAuthCookie(context: BrowserContext) {
  await context.addCookies([
    {
      name: AUTH_COOKIE_NAME,
      value: SOFT_AUTH_COOKIE_VALUE,
      domain: "127.0.0.1",
      path: "/",
    },
  ]);
}

test.describe("proxy route protection", () => {
  for (const route of protectedRoutes) {
    test(`redirects unauthenticated requests from ${route}`, async ({ page }) => {
      await page.goto(route);

      expect(new URL(page.url()).pathname).toBe("/");
      await expect(page.getByRole("heading", { name: "Create amazing" })).toBeVisible();
    });
  }

  for (const route of publicRoutes) {
    test(`keeps ${route} public`, async ({ page }) => {
      const response = await page.goto(route);

      expect(response?.status()).toBeLessThan(400);
      expect(new URL(page.url()).pathname).toBe(route);
    });
  }

  test("allows soft-authenticated navigation to protected app pages", async ({
    page,
    context,
  }) => {
    await addSoftAuthCookie(context);

    await page.goto("/tools");

    expect(new URL(page.url()).pathname).toBe("/tools");
    await expect(page.getByRole("heading", { name: "Tools" })).toBeVisible();
  });

  test("does not intercept static public assets", async ({ page }) => {
    const response = await page.goto("/hero.png");

    expect(response?.status()).toBe(200);
    expect(new URL(page.url()).pathname).toBe("/hero.png");
  });

  test("keeps API routes server-protected without relying on proxy", async ({
    request,
  }) => {
    const chat = await request.post("/api/chat", {
      data: { messages: [{ role: "user", parts: [{ type: "text", text: "Hi" }] }] },
    });
    const checkout = await request.post("/api/billing/checkout", {
      data: { packId: "starter", redirectPath: "/account" },
    });
    const proxy = await request.get(
      `/api/proxy?url=${encodeURIComponent("https://example.com")}`
    );

    expect(chat.status()).toBe(401);
    expect(checkout.status()).toBe(401);
    expect(proxy.status()).toBe(401);
  });

  test("normalizes external payment success redirects to account", async ({
    page,
    context,
  }) => {
    await addSoftAuthCookie(context);

    await page.goto("/payment-success?redirect=https%3A%2F%2Fevil.example");

    await expect(
      page.getByRole("heading", { name: "Purchase not confirmed" })
    ).toBeVisible();
    await expect(page.getByRole("link", { name: /Continue/ })).toHaveAttribute(
      "href",
      "/account"
    );
  });
});
