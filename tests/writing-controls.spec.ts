import { expect, test, type BrowserContext } from "@playwright/test";

const AUTH_COOKIE_NAME = "xrefAuthToken";
const SOFT_AUTH_COOKIE_VALUE = "playwright-soft-auth";

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

test.describe("Freestyle Writing controls", () => {
  test("shows deliverable controls and syncs length to word count", async ({
    page,
    context,
  }) => {
    await addSoftAuthCookie(context);
    await page.goto("/tools?tool=Freestyle%20Writing");

    await expect(
      page.getByRole("heading", { name: "Freestyle Writing" })
    ).toBeVisible();
    await expect(page.getByLabel("Deliverable")).toHaveValue("freeform");
    await expect(page.getByLabel("Tone")).toHaveValue("clear");
    await expect(page.getByLabel("Audience")).toHaveValue("general");
    await expect(page.getByLabel("Draft length")).toHaveValue("standard");
    await expect(page.getByLabel(/Approximate number of words/)).toHaveValue(
      "220"
    );

    await page.getByLabel("Deliverable").selectOption("blog-outline");
    await page.getByLabel("Tone").selectOption("expert");
    await page.getByLabel("Audience").selectOption("executives");
    await page.getByLabel("Draft length").selectOption("detailed");

    await expect(page.getByLabel("Deliverable")).toHaveValue("blog-outline");
    await expect(page.getByLabel("Tone")).toHaveValue("expert");
    await expect(page.getByLabel("Audience")).toHaveValue("executives");
    await expect(page.getByLabel(/Approximate number of words/)).toHaveValue(
      "360"
    );
  });

  test("prefills creator starter with social writing controls", async ({
    page,
    context,
  }) => {
    await addSoftAuthCookie(context);

    const params = new URLSearchParams({
      intent: "creator-social-captions",
      tool: "Freestyle Writing",
      prompt:
        "Write 5 social media caption options for a new creator newsletter.",
      words: "160",
    });

    await page.goto(`/tools?${params.toString()}`);

    await expect(page.getByText("Creator starter")).toBeVisible();
    await expect(page.getByLabel("Prompt")).toHaveValue(
      /creator newsletter/
    );
    await expect(page.getByLabel("Deliverable")).toHaveValue("social-post");
    await expect(page.getByLabel("Tone")).toHaveValue("playful");
    await expect(page.getByLabel("Audience")).toHaveValue("creators");
    await expect(page.getByLabel("Draft length")).toHaveValue("brief");
    await expect(page.getByLabel("Call to action")).toHaveValue(
      /comment, click, or try/
    );
  });
});
