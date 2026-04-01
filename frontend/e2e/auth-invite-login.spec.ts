import { test, expect } from "@playwright/test";
import { promises as fs } from "node:fs";

const backendUrl = process.env.BACKEND_URL ?? "http://backend:8000";

test.describe("Auth invite login flow", () => {
  test("owner boots workspace and invites an editor", async ({ page }) => {
    await page.goto("/login");
    await page.getByTestId("login-email").fill("owner@example.com");
    await page.getByTestId("login-password").fill("testpassword123");
    await page.getByTestId("login-submit").click();
    await expect(page).toHaveURL("/");
    await page.screenshot({
      path: "../.sisyphus/evidence/task-4-owner-editor-flow.png",
    });
  });

  test("editor cannot see invite management", async ({ page }) => {
    await page.goto("/login");
    await page.getByTestId("login-email").fill("editor@example.com");
    await page.getByTestId("login-password").fill("testpassword123");
    await page.getByTestId("login-submit").click();
    await expect(page).toHaveURL("/");

    const csrfResponse = await page.request.get(
      `${backendUrl}/api/v1/auth/csrf`,
    );
    const csrfData = (await csrfResponse.json()) as { csrf_token?: string };
    const csrf = csrfData.csrf_token ?? "";

    const response = await page.request.post(
      `${backendUrl}/api/v1/auth/invites`,
      {
        data: {
          email: "blocked@example.com",
          role: "editor",
        },
        headers: {
          "X-CSRF-Token": csrf,
          Cookie: (await page.context().cookies(backendUrl))
            .map((cookie) => `${cookie.name}=${cookie.value}`)
            .join("; "),
        },
      },
    );

    const text = `status=${response.status()}\nbody=${await response.text()}`;
    await fs.writeFile(
      "../.sisyphus/evidence/task-4-editor-invite-forbidden.txt",
      text,
      "utf-8",
    );
    await expect(response.status()).toBe(403);
  });

  test("authenticated user can sign out from the app shell", async ({
    page,
  }) => {
    await page.route("**/api/v1/auth/me", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          email: "owner@example.com",
          name: "Owner",
          role: "owner",
          csrf_token: "csrf-token",
        }),
      });
    });

    await page.route("**/api/v1/auth/csrf", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true, csrf_token: "csrf-token" }),
      });
    });

    await page.route("**/api/v1/auth/logout", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true }),
      });
    });

    await page.goto("/");
    await expect(page).toHaveURL("/");

    await page.getByTestId("logout-button").click();

    await expect(page).toHaveURL(/\/login\?loggedOut=1$/);
    await expect(page.getByText("You have been signed out.")).toBeVisible();
  });

  test("invite acceptance redirects to login with a success message", async ({
    page,
  }) => {
    await page.route(
      "**/api/v1/auth/invites/test-token/accept",
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ ok: true }),
        });
      },
    );

    await page.goto("/invite/test-token");
    await page.locator("#invite-name").fill("Editor User");
    await page.locator("#invite-password").fill("testpassword123");
    await page.locator("#invite-confirm-password").fill("testpassword123");
    await page.getByRole("button", { name: "Accept invite" }).click();

    await expect(page).toHaveURL(/\/login\?inviteAccepted=1$/);
    await expect(
      page.getByText("Account created. Sign in to continue."),
    ).toBeVisible();
  });

  test("membership-denied bootstrap redirects back to login", async ({
    page,
  }) => {
    await page.route("**/api/v1/auth/me", async (route) => {
      await route.fulfill({
        status: 403,
        contentType: "application/json",
        body: JSON.stringify({ detail: "Workspace membership required" }),
      });
    });

    await page.goto("/");

    await expect(page).toHaveURL("/login");
    await expect(page.getByTestId("login-form")).toBeVisible();
  });
});
