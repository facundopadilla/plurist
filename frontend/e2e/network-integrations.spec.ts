import { test, expect } from "@playwright/test";

import { evidencePath } from "./evidence-path";
import { expectPostPasswordLoginUrl } from "./expect-post-login";

async function loginAs(page: import("@playwright/test").Page, email: string) {
  await page.goto("/login");
  await page.getByTestId("login-email").fill(email);
  await page.getByTestId("login-password").fill("testpassword123");
  await page.getByTestId("login-submit").click();
  await expectPostPasswordLoginUrl(page);
}

test.describe("Network integrations (Task 13)", () => {
  test("owner navigates to /settings/ai-providers (workspace settings)", async ({
    page,
  }) => {
    await loginAs(page, "owner@test.com");
    await page.goto("/settings/ai-providers");
    await expect(page).toHaveURL("/settings/ai-providers");
    await expect(
      page.getByRole("heading", { name: "AI Providers", exact: true }),
    ).toBeVisible();
    await page.screenshot({
      path: evidencePath("task-13-ai-providers-page.png"),
    });
  });
});
