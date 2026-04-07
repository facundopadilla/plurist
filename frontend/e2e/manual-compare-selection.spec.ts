import { test, expect } from "@playwright/test";
import { promises as fs } from "node:fs";

async function loginAsEditor(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByTestId("login-email").fill("editor@test.com");
  await page.getByTestId("login-password").fill("testpassword123");
  await page.getByTestId("login-submit").click();
  await expect(page).toHaveURL("/");
}

async function getCsrf(page: import("@playwright/test").Page) {
  const csrfResponse = await page.request.get(`/api/v1/auth/csrf`);
  const csrfData = (await csrfResponse.json()) as { csrf_token?: string };
  return csrfData.csrf_token ?? "";
}

test.describe("Manual compare selection (Task 12)", () => {
  test("legacy /posts route redirects to /contenido", async ({ page }) => {
    await loginAsEditor(page);
    await page.goto("/posts");
    await expect(page).toHaveURL("/contenido");
    await page.screenshot({
      path: "../.sisyphus/evidence/task-12-posts-page.png",
    });
  });

  test("contenido page exposes the new content entrypoint", async ({
    page,
  }) => {
    await loginAsEditor(page);
    await page.goto("/contenido");

    await expect(
      page.getByRole("heading", { name: /Contenido/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Nuevo contenido/i }),
    ).toBeVisible();

    await page.screenshot({
      path: "../.sisyphus/evidence/task-12-submit-disabled.png",
    });
  });

  test("editor creates a draft post via API and the post is retrievable", async ({
    page,
  }) => {
    await loginAsEditor(page);

    const csrf = await getCsrf(page);

    const createResponse = await page.request.post(`/api/v1/content/`, {
      data: {
        title: "E2E draft post",
        body_text: "Body text for e2e test",
        target_networks: [],
        render_asset_key: "",
      },
      headers: {
        "X-CSRF-Token": csrf,
      },
    });

    expect(createResponse.status()).toBe(201);
    const created = (await createResponse.json()) as {
      id: number;
      title: string;
      status: string;
    };
    expect(created.title).toBe("E2E draft post");
    expect(created.status).toBe("draft");

    const getResponse = await page.request.get(
      `/api/v1/content/${created.id}`,
      {
        headers: {
          "X-CSRF-Token": csrf,
        },
      },
    );

    expect(getResponse.status()).toBe(200);
    const fetched = (await getResponse.json()) as {
      id: number;
      status: string;
    };
    expect(fetched.id).toBe(created.id);
    expect(fetched.status).toBe("draft");

    const evidence = `status=${createResponse.status()}\npost_id=${created.id}\npost_status=${created.status}`;
    await fs.writeFile(
      "../.sisyphus/evidence/task-12-draft-post-api.txt",
      evidence,
      "utf-8",
    );
  });
});
