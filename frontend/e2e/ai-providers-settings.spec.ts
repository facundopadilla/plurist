import { test, expect } from "@playwright/test";

test.describe("AI Providers settings", () => {
  test("owner opens AI Providers from sidebar and sees the page", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.getByTestId("login-email").fill("owner@test.com");
    await page.getByTestId("login-password").fill("testpassword123");
    await page.getByTestId("login-submit").click();
    await expect(page).toHaveURL("/");

    await page.getByTestId("nav-ai-providers").click();
    await expect(page).toHaveURL("/settings/ai-providers");

    await expect(
      page.getByRole("heading", { name: "AI Providers", exact: true }),
    ).toBeVisible();
  });

  test("direct navigation to /settings/ai-providers loads", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.getByTestId("login-email").fill("owner@test.com");
    await page.getByTestId("login-password").fill("testpassword123");
    await page.getByTestId("login-submit").click();
    await expect(page).toHaveURL("/");

    await page.goto("/settings/ai-providers");
    await expect(page).toHaveURL("/settings/ai-providers");
    await expect(
      page.getByRole("heading", { name: "AI Providers", exact: true }),
    ).toBeVisible();
  });
});
