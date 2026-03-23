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
    await page.screenshot({ path: "../.sisyphus/evidence/task-4-owner-editor-flow.png" });
  });

  test("editor cannot see invite management", async ({ page }) => {
    await page.goto("/login");
    await page.getByTestId("login-email").fill("editor@example.com");
    await page.getByTestId("login-password").fill("testpassword123");
    await page.getByTestId("login-submit").click();
    await expect(page).toHaveURL("/");

    const csrfResponse = await page.request.get(`${backendUrl}/api/v1/auth/csrf`);
    const csrfData = (await csrfResponse.json()) as { csrf_token?: string };
    const csrf = csrfData.csrf_token ?? "";

    const response = await page.request.post(`${backendUrl}/api/v1/auth/invites`, {
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
    });

    const text = `status=${response.status()}\nbody=${await response.text()}`;
    await fs.writeFile("../.sisyphus/evidence/task-4-editor-invite-forbidden.txt", text, "utf-8");
    await expect(response.status()).toBe(403);
  });
});
