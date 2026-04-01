import { test, expect } from "@playwright/test";

async function loginAsEditor(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByTestId("login-email").fill("editor@example.com");
  await page.getByTestId("login-password").fill("testpassword123");
  await page.getByTestId("login-submit").click();
  await expect(page).toHaveURL("/");
}

test.describe("Contenido — entrypoints y navegación", () => {
  test("contenido page loads with the renamed UI", async ({ page }) => {
    await loginAsEditor(page);
    await page.goto("/contenido");

    await expect(
      page.getByRole("heading", { name: /^Contenido$/i }),
    ).toBeVisible();
    await expect(
      page.getByText(/Revisá, aprobá y publicá contenido por proyecto./i),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Nuevo contenido/i }),
    ).toBeVisible();
  });

  test("nuevo contenido CTA opens the compose canvas", async ({ page }) => {
    await loginAsEditor(page);
    await page.goto("/contenido");

    await page.getByRole("button", { name: /Nuevo contenido/i }).click();

    await expect(page).toHaveURL(/\/compose/);
    await expect(page.getByTestId("canvas-compose-page")).toBeVisible();
    await expect(page.getByTestId("vertical-navbar")).toBeVisible();
  });

  test("legacy /posts route lands in the renamed content area", async ({
    page,
  }) => {
    await loginAsEditor(page);
    await page.goto("/posts");

    await expect(page).toHaveURL("/contenido");
    await expect(
      page.getByRole("heading", { name: /^Contenido$/i }),
    ).toBeVisible();
  });
});
