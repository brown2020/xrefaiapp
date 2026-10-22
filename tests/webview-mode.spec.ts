import { expect, test, type Page } from "@playwright/test";

/** Pretend to be the Expo app: react-native-webview defines this before page scripts run. */
async function openAsApp(page: Page, path: string) {
  await page.addInitScript(() => {
    Object.defineProperty(window, "ReactNativeWebView", {
      value: { postMessage: () => undefined },
      configurable: true,
    });
  });
  await page.goto(path);
  await page.waitForLoadState("networkidle");
}

test("browser sign-in pages offer Google sign-in", async ({ page }) => {
  for (const path of ["/login", "/signup"]) {
    await page.goto(path);
    await expect(page.getByRole("button", { name: "Continue with Google" })).toBeVisible();
  }
});

test("the app hides Google sign-in but keeps email sign-in", async ({ page }) => {
  for (const path of ["/login", "/signup"]) {
    await openAsApp(page, path);
    await expect(page.getByLabel("Email", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Continue with Google" })).toHaveCount(0);
    expect(await page.content()).not.toContain("Continue with Google");
  }
});

test("browser homepage offers credit purchases", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Buy credits" })).toBeVisible();
  await expect(page.getByText("Stripe checkout")).toBeVisible();
});

test("the app homepage has no purchase calls to action", async ({ page }) => {
  await openAsApp(page, "/");
  await expect(page.getByRole("link", { name: "Read terms" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Buy credits" })).toHaveCount(0);
  await expect(page.getByText("Stripe checkout")).toHaveCount(0);
});
