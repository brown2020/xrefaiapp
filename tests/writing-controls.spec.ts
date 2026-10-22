import { expect, test, type BrowserContext, type Page } from "@playwright/test";

const AUTH_COOKIE_NAME = "xrefAuthToken";
const SOFT_AUTH_COOKIE_VALUE = "playwright-soft-auth";

/**
 * Waits for React to hydrate the server-rendered select (hydration resets a
 * value chosen before it), then retries until the choice sticks.
 */
async function choose(page: Page, label: string, value: string) {
  const select = page.getByLabel(label);
  await expect
    .poll(() =>
      select.evaluate((el) => Object.keys(el).some((key) => key.startsWith("__reactFiber")))
    )
    .toBe(true);
  await expect(async () => {
    await select.selectOption(value);
    await expect(select).toHaveValue(value, { timeout: 500 });
  }).toPass();
}

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
    await expect(page.getByLabel(/Approximate length in words/)).toHaveValue(
      "220"
    );

    await choose(page, "Deliverable", "blog-outline");
    await choose(page, "Tone", "expert");
    await choose(page, "Audience", "executives");
    await choose(page, "Draft length", "detailed");

    await expect(page.getByLabel("Deliverable")).toHaveValue("blog-outline");
    await expect(page.getByLabel("Tone")).toHaveValue("expert");
    await expect(page.getByLabel("Audience")).toHaveValue("executives");
    await expect(page.getByLabel(/Approximate length in words/)).toHaveValue(
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

test.describe("Summarize Text controls", () => {
  test("shows summary format, audience, emphasis, and focus controls", async ({
    page,
    context,
  }) => {
    await addSoftAuthCookie(context);
    await page.goto("/tools?tool=Summarize%20Text");

    await expect(
      page.getByRole("heading", { name: "Summarize Text" })
    ).toBeVisible();
    await expect(page.getByLabel("Summary format")).toHaveValue("concise");
    await expect(page.getByLabel("Audience")).toHaveValue("general");
    await expect(page.getByLabel("Emphasis")).toHaveValue("main-ideas");

    await choose(page, "Summary format", "executive-brief");
    await choose(page, "Audience", "executives");
    await choose(page, "Emphasis", "actions-decisions");
    await page.getByLabel("Focus").fill("launch risks");

    await expect(page.getByLabel("Summary format")).toHaveValue(
      "executive-brief"
    );
    await expect(page.getByLabel("Audience")).toHaveValue("executives");
    await expect(page.getByLabel("Emphasis")).toHaveValue("actions-decisions");
    await expect(page.getByLabel("Focus")).toHaveValue("launch risks");
  });
});
