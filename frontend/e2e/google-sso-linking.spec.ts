import { expect, test } from "@playwright/test";

test.describe("Google SSO linking", () => {
  test("successful Google callback lands authenticated user at dashboard", async ({
    page,
  }) => {
    await page.route("**/api/v1/auth/google/callback**", async (route) => {
      await route.fulfill({
        status: 302,
        headers: { location: "/" },
      });
    });

    await page.route("**/api/v1/auth/me", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          email: "editor@example.com",
          name: "Editor",
          role: "editor",
          csrf_token: "csrf-token",
        }),
      });
    });

    await page.goto(
      "/api/v1/auth/google/callback?code=fake-code&state=fake-state",
    );
    await expect(page).toHaveURL("/");
    await expect(
      page.getByRole("heading", { name: "Dashboard" }),
    ).toBeVisible();
  });

  test("uninvited Google callback returns 403", async ({ page }) => {
    await page.route("**/api/v1/auth/google/callback**", async (route) => {
      await route.fulfill({
        status: 403,
        contentType: "application/json",
        body: JSON.stringify({
          detail: "An invite is required to join this workspace",
        }),
      });
    });

    const callbackResponse = await page.goto(
      "/api/v1/auth/google/callback?code=bad-code&state=bad-state",
    );

    expect(callbackResponse?.status()).toBe(403);
    await expect(
      page.getByText("invite is required", { exact: false }),
    ).toBeVisible();
  });
});
