import { test, expect } from "@playwright/test";

import { expectPostPasswordLoginUrl } from "./expect-post-login";

async function loginAndOpenCompose(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByTestId("login-email").fill("editor@test.com");
  await page.getByTestId("login-password").fill("testpassword123");
  await page.getByTestId("login-submit").click();
  await expectPostPasswordLoginUrl(page);
  await page.goto("/compose");
}

test.describe("Canvas Code Editor panel", () => {
  test("opens Code panel and shows file tree with styles.css", async ({
    page,
  }) => {
    await loginAndOpenCompose(page);

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
    await loginAndOpenCompose(page);

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
    await loginAndOpenCompose(page);

    await expect(
      page.locator('[data-testid="canvas-compose-page"]'),
    ).toBeVisible({ timeout: 10000 });

    // Chat sidebar open by default (Plan / Build in header)
    await expect(page.getByRole("button", { name: "Plan" })).toBeVisible();

    // Switch to Code
    await page.locator('[data-testid="navbar-tool-code"]').click();
    await expect(page.locator('[data-testid="code-editor-panel"]')).toBeVisible(
      { timeout: 5000 },
    );

    // Chat sidebar hidden while Code panel is active
    await expect(page.getByRole("button", { name: "Plan" })).not.toBeVisible();

    // Switch back to Chat
    await page.locator('[data-testid="navbar-tool-chat"]').click();
    await expect(page.getByRole("button", { name: "Plan" })).toBeVisible({
      timeout: 5000,
    });
    await expect(page.locator('[data-testid="code-editor-panel"]')).toHaveCount(
      0,
    );
  });
});
