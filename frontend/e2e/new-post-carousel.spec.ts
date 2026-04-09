import { test, expect } from "@playwright/test";

import { expectPostPasswordLoginUrl } from "./expect-post-login";

async function loginAsEditor(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByTestId("login-email").fill("editor@test.com");
  await page.getByTestId("login-password").fill("testpassword123");
  await page.getByTestId("login-submit").click();
  await expectPostPasswordLoginUrl(page);
}

test.describe("Content — entrypoints and navigation", () => {
  test("content page loads with the expected UI", async ({ page }) => {
    await loginAsEditor(page);
    await page.goto("/content");

    await expect(
      page.getByRole("heading", { name: /^Content$/i }),
    ).toBeVisible();
    await expect(
      page.getByText(/Review and manage content by project\./i),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /New content/i }),
    ).toBeVisible();
  });

  test("New content CTA opens the compose canvas", async ({ page }) => {
    await loginAsEditor(page);
    await page.goto("/content");

    await page.getByRole("button", { name: /New content/i }).click();

    await expect(page).toHaveURL(/\/compose/);
    await expect(page.getByTestId("canvas-compose-page")).toBeVisible();
    await expect(page.getByTestId("vertical-navbar")).toBeVisible();
  });

  test("legacy /posts route lands in the renamed content area", async ({
    page,
  }) => {
    await loginAsEditor(page);
    await page.goto("/posts");

    await expect(page).toHaveURL("/content");
    await expect(
      page.getByRole("heading", { name: /^Content$/i }),
    ).toBeVisible();
  });
});
