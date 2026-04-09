import { test, expect } from "@playwright/test";

import { evidencePath } from "./evidence-path";

async function loginAsOwner(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByTestId("login-email").fill("owner@test.com");
  await page.getByTestId("login-password").fill("testpassword123");
  await page.getByTestId("login-submit").click();
  await expect(page).toHaveURL(/\/(dashboard)?$/);
}

test.describe("App shell", () => {
  test("renders current navigation and logout control", async ({ page }) => {
    await loginAsOwner(page);
    await expect(page.getByTestId("app-sidebar")).toBeVisible();
    await expect(page.getByTestId("nav-dashboard")).toBeVisible();
    await expect(page.getByTestId("nav-projects")).toBeVisible();
    await expect(page.getByTestId("nav-design-bank")).toBeVisible();
    await expect(page.getByTestId("nav-content")).toBeVisible();
    await expect(page.getByTestId("nav-ai-providers")).toBeVisible();
    await expect(page.getByTestId("logout-button")).toBeVisible();
    await page.screenshot({
      path: evidencePath("task-3-app-shell.png"),
    });
  });

  test("dashboard quick actions are visible after login", async ({ page }) => {
    await loginAsOwner(page);
    await expect(
      page.getByRole("link", { name: /Open Canvas Studio/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /Browse projects/i }),
    ).toBeVisible();
  });

  test("unknown route shows fullscreen 404 without app shell, then dashboard", async ({
    page,
  }) => {
    await loginAsOwner(page);
    await page.goto("/this-route-does-not-exist");
    await expect(page.getByTestId("app-sidebar")).not.toBeVisible();
    await expect(page.getByTestId("not-found-page")).toBeVisible();
    await expect(page.locator("h1")).toContainText("404");
    await page.screenshot({
      path: evidencePath("task-3-404.png"),
    });
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 12_000 });
  });
});
