import { test, expect } from "@playwright/test";

test("app shell renders all nav items", async ({ page }) => {
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
});

test("theme toggle switches between light and dark", async ({ page }) => {
  await page.goto("/");
  const html = page.locator("html");
  const toggle = page.getByTestId("theme-toggle");

  const initialClass = await html.getAttribute("class");
  await toggle.click();
  const afterClass = await html.getAttribute("class");

  expect(initialClass).not.toEqual(afterClass);
});

test("unknown route shows 404 inside app shell", async ({ page }) => {
  await page.goto("/this-route-does-not-exist");
  await expect(page.getByTestId("app-sidebar")).toBeVisible();
  await expect(page.locator("h1")).toHaveText("404");
});
