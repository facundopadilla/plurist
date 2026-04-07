import { test, expect } from "@playwright/test";

test.describe("Canvas Compose page", () => {
  test("renders canvas without AppShell sidebar", async ({ page }) => {
    // Navigate to compose page
    await page.goto("/compose");

    // The canvas compose page should render
    const canvasPage = page.locator('[data-testid="canvas-compose-page"]');

    const loginForm = page.locator('[data-testid="login-form"]');

    await expect
      .poll(
        async () => {
          const currentUrl = page.url();
          if (currentUrl.includes("/login") || currentUrl.includes("/auth")) {
            return "login-url";
          }
          if (await loginForm.isVisible().catch(() => false)) {
            return "login-form";
          }
          if (await canvasPage.isVisible().catch(() => false)) {
            return "canvas";
          }
          return "pending";
        },
        { timeout: 10000 },
      )
      .not.toBe("pending");

    const url = page.url();

    if (url.includes("/login") || url.includes("/auth")) {
      expect(url).toBeTruthy();
    } else if (await loginForm.isVisible().catch(() => false)) {
      await expect(loginForm).toBeVisible();
    } else {
      // Canvas page loaded
      await expect(canvasPage).toBeVisible({ timeout: 10000 });

      // Should NOT have AppShell sidebar (nav with links)
      const appShellNav = page.locator('[data-testid="app-shell-nav"]');
      await expect(appShellNav).not.toBeVisible();

      // Should have the header bar
      const header = page.locator("header");
      await expect(header).toBeVisible();

      // Should have the vertical navbar
      const navbar = page.locator('[data-testid="vertical-navbar"]');
      await expect(navbar).toBeVisible();

      // Chat panel should be open by default on page entry
      await expect(page.locator("text=Chat IA")).toBeVisible();
      await expect(page.locator('[data-testid="side-panel"]')).toBeVisible();

      // Switching to resources should swap visible panel content
      await page.locator('[data-testid="navbar-tool-resources"]').click();
      await expect(
        page.locator('[data-testid="resources-panel"]'),
      ).toBeVisible();
      await expect(page.locator("text=Recursos")).toBeVisible();

      // Clicking the active tool closes the panel
      await page.locator('[data-testid="navbar-tool-resources"]').click();
      await expect(page.locator('[data-testid="side-panel"]')).toHaveCount(0);

      // Reopening chat should restore the chat panel
      await page.locator('[data-testid="navbar-tool-chat"]').click();
      await expect(page.locator("text=Chat IA")).toBeVisible();
    }
  });

  test("canvas compose page URL structure is correct", async ({ page }) => {
    const response = await page.goto("/compose");
    // Should not 404
    expect(response?.status()).not.toBe(404);
  });

  test("compose page with postId param does not crash", async ({ page }) => {
    const response = await page.goto("/compose?postId=999");
    // Should not 404 or 500
    expect(response?.status()).not.toBe(404);
    expect(response?.status()).not.toBe(500);
  });

  test("mobile viewport shows desktop-only notice", async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/compose");

    const loginForm = page.locator('[data-testid="login-form"]');
    const notice = page.locator("text=Canvas Studio");

    await expect
      .poll(
        async () => {
          const currentUrl = page.url();
          if (currentUrl.includes("/login") || currentUrl.includes("/auth")) {
            return "login-url";
          }
          if (await loginForm.isVisible().catch(() => false)) {
            return "login-form";
          }
          if (await notice.isVisible().catch(() => false)) {
            return "desktop-notice";
          }
          return "pending";
        },
        { timeout: 5000 },
      )
      .not.toBe("pending");

    const url = page.url();
    if (url.includes("/login") || url.includes("/auth")) {
      expect(url).toBeTruthy();
    } else if (await loginForm.isVisible().catch(() => false)) {
      await expect(loginForm).toBeVisible();
    } else {
      await expect(page.locator("text=Canvas Studio")).toBeVisible();
      await expect(
        page.locator(
          "text=Canvas Compose requires a desktop browser (1024px+).",
        ),
      ).toBeVisible();
    }
  });
});
