import { test, expect } from "@playwright/test";

test.describe("App shell", () => {
  test("renders navigation and theme toggle", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("app-sidebar")).toBeVisible();
    await expect(page.getByTestId("nav-dashboard")).toBeVisible();
    await expect(page.getByTestId("nav-design-bank")).toBeVisible();
    await expect(page.getByTestId("nav-posts")).toBeVisible();
    await expect(page.getByTestId("nav-review")).toBeVisible();
    await expect(page.getByTestId("nav-queue")).toBeVisible();
    await expect(page.getByTestId("nav-calendar")).toBeVisible();
    await expect(page.getByTestId("nav-analytics")).toBeVisible();
    await expect(page.getByTestId("nav-settings")).toBeVisible();
    await expect(page.getByTestId("theme-toggle")).toBeVisible();
    await page.screenshot({
      path: ".sisyphus/evidence/task-3-app-shell.png",
    });
  });

  test("theme toggle switches mode", async ({ page }) => {
    await page.goto("/");
    const html = page.locator("html");
    const before = await html.getAttribute("class");
    await page.getByTestId("theme-toggle").click();
    const after = await html.getAttribute("class");
    expect(before).not.toEqual(after);
  });

  test("unknown route shows 404 inside app shell", async ({ page }) => {
    await page.goto("/this-route-does-not-exist");
    await expect(page.getByTestId("app-sidebar")).toBeVisible();
    await expect(page.locator("h1")).toContainText("404");
    await page.screenshot({
      path: ".sisyphus/evidence/task-3-404.png",
    });
  });
});
