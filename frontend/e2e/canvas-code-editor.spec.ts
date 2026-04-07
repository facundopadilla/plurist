import { test, expect } from "@playwright/test";

test.describe("Canvas Code Editor panel", () => {
  test("opens Code panel and shows file tree with styles.css", async ({
    page,
  }) => {
    await page.goto("/compose");

    const url = page.url();
    // Skip if redirected to auth
    if (url.includes("/login") || url.includes("/auth")) {
      test.skip();
      return;
    }

    // Wait for canvas to load
    await expect(
      page.locator('[data-testid="canvas-compose-page"]'),
    ).toBeVisible({ timeout: 10000 });

    // Click the Code button in the navbar
    await page.locator('[data-testid="navbar-tool-code"]').click();

    // Code editor panel should appear
    await expect(page.locator('[data-testid="code-editor-panel"]')).toBeVisible(
      { timeout: 5000 },
    );

    // File tree should be visible
    await expect(page.locator('[data-testid="file-tree"]')).toBeVisible();

    // styles.css should always be present in the file tree
    await expect(
      page.locator('[data-testid="file-tree-item-styles.css"]'),
    ).toBeVisible();
  });

  test("clicking Code button toggles the panel open and closed", async ({
    page,
  }) => {
    await page.goto("/compose");

    const url = page.url();
    if (url.includes("/login") || url.includes("/auth")) {
      test.skip();
      return;
    }

    await expect(
      page.locator('[data-testid="canvas-compose-page"]'),
    ).toBeVisible({ timeout: 10000 });

    // Open Code panel
    await page.locator('[data-testid="navbar-tool-code"]').click();
    await expect(page.locator('[data-testid="code-editor-panel"]')).toBeVisible(
      { timeout: 5000 },
    );

    // Close Code panel
    await page.locator('[data-testid="navbar-tool-code"]').click();
    await expect(page.locator('[data-testid="code-editor-panel"]')).toHaveCount(
      0,
    );
  });

  test("switching between Chat and Code panels works", async ({ page }) => {
    await page.goto("/compose");

    const url = page.url();
    if (url.includes("/login") || url.includes("/auth")) {
      test.skip();
      return;
    }

    await expect(
      page.locator('[data-testid="canvas-compose-page"]'),
    ).toBeVisible({ timeout: 10000 });

    // Chat should be open by default
    await expect(page.locator("text=Chat IA")).toBeVisible();

    // Switch to Code
    await page.locator('[data-testid="navbar-tool-code"]').click();
    await expect(page.locator('[data-testid="code-editor-panel"]')).toBeVisible(
      { timeout: 5000 },
    );

    // Chat should no longer be visible (only one panel at a time)
    await expect(page.locator("text=Chat IA")).not.toBeVisible();

    // Switch back to Chat
    await page.locator('[data-testid="navbar-tool-chat"]').click();
    await expect(page.locator("text=Chat IA")).toBeVisible({ timeout: 5000 });
    await expect(page.locator('[data-testid="code-editor-panel"]')).toHaveCount(
      0,
    );
  });
});
