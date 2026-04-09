import { test, expect } from "@playwright/test";
import { promises as fs } from "node:fs";

async function loginAs(page: import("@playwright/test").Page, email: string) {
  await page.goto("/login");
  await page.getByTestId("login-email").fill(email);
  await page.getByTestId("login-password").fill("testpassword123");
  await page.getByTestId("login-submit").click();
  await expect(page).toHaveURL("/");
}

async function getCsrf(page: import("@playwright/test").Page) {
  const csrfResponse = await page.request.get(`/api/v1/auth/csrf`);
  const csrfData = (await csrfResponse.json()) as { csrf_token?: string };
  return csrfData.csrf_token ?? "";
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
      path: "../.sisyphus/evidence/task-13-ai-providers-page.png",
    });
  });

  test("owner creates a connection via API and verifies it exists", async ({
    page,
  }) => {
    await loginAs(page, "owner@test.com");

    const csrf = await getCsrf(page);

    const createResponse = await page.request.post(
      `/api/v1/integrations/connections`,
      {
        data: {
          network: "linkedin",
          display_name: "E2E LinkedIn Connection",
        },
        headers: {
          "X-CSRF-Token": csrf,
        },
      },
    );

    expect(createResponse.status()).toBe(201);
    const created = (await createResponse.json()) as {
      id: number;
      network: string;
      display_name: string;
      is_active: boolean;
    };
    expect(created.network).toBe("linkedin");
    expect(created.display_name).toBe("E2E LinkedIn Connection");

    const listResponse = await page.request.get(
      `/api/v1/integrations/connections`,
      {
        headers: {
          "X-CSRF-Token": csrf,
        },
      },
    );

    expect(listResponse.status()).toBe(200);
    const connections = (await listResponse.json()) as Array<{
      id: number;
      network: string;
    }>;
    const found = connections.find((c) => c.id === created.id);
    expect(found).toBeDefined();
    expect(found?.network).toBe("linkedin");

    const evidence =
      `create_status=${createResponse.status()}\n` +
      `connection_id=${created.id}\n` +
      `network=${created.network}\n` +
      `display_name=${created.display_name}`;
    await fs.writeFile(
      "../.sisyphus/evidence/task-13-owner-create-connection.txt",
      evidence,
      "utf-8",
    );
  });

  test("editor gets 403 when attempting to create a connection via API", async ({
    page,
  }) => {
    await loginAs(page, "editor@test.com");

    const csrf = await getCsrf(page);

    const response = await page.request.post(
      `/api/v1/integrations/connections`,
      {
        data: {
          network: "linkedin",
          display_name: "Editor Attempt",
        },
        headers: {
          "X-CSRF-Token": csrf,
        },
      },
    );

    const evidence = `status=${response.status()}\nbody=${await response.text()}`;
    await fs.writeFile(
      "../.sisyphus/evidence/task-13-editor-create-connection-forbidden.txt",
      evidence,
      "utf-8",
    );

    expect(response.status()).toBe(403);
  });
});
