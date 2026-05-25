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

for (const viewport of [
  { name: "desktop", width: 1280, height: 900 },
  { name: "mobile", width: 390, height: 844 },
]) {
  test(`homepage starter link opens a prefilled tool on ${viewport.name}`, async ({
    page,
    context,
  }) => {
    await page.setViewportSize(viewport);

    await page.goto("/");
    await expect(
      page.getByRole("heading", {
        name: "Start from a use case, not a blank page.",
      })
    ).toBeVisible();

    const starterLink = page.getByRole("link", {
      name: /Draft social captions/,
    });
    await expect(starterLink).toHaveAttribute(
      "href",
      /\/tools\?.*intent=creator-social-captions/
    );

    const href = await starterLink.getAttribute("href");
    expect(href).toBeTruthy();
    await addSoftAuthCookie(context);
    await page.goto(href ?? "/tools");
    await expect(page).toHaveURL(/\/tools\?.*intent=creator-social-captions/);
    await expect(
      page.getByRole("heading", { name: "Freestyle Writing" })
    ).toBeVisible();
    await expect(page.getByText("Creator starter")).toBeVisible();
    await expect(page.getByText("Estimated cost")).toBeVisible();
    await expect(page.getByLabel("Prompt")).toHaveValue(
      /Write 5 social media caption options/
    );
  });
}

test("student chat starter opens with a guided prompt", async ({
  page,
  context,
}) => {
  await addSoftAuthCookie(context);

  const params = new URLSearchParams({
    intent: "student-study-guide",
    prompt:
      "Create a study guide for photosynthesis. Include key concepts, simple definitions, a short summary, and 5 quiz questions.",
  });

  await page.goto(`/chat?${params.toString()}`);

  await expect(page.getByText("Student starter")).toBeVisible();
  await expect(page.getByText("Expected input")).toBeVisible();
  await expect(page.getByPlaceholder("Ask me anything...")).toHaveValue(
    /Create a study guide for photosynthesis/
  );
});
