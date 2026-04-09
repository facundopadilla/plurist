import { test, expect } from "@playwright/test";
import { promises as fs } from "node:fs";

import { evidencePath } from "./evidence-path";
import { expectPostPasswordLoginUrl } from "./expect-post-login";

async function loginAsEditor(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByTestId("login-email").fill("editor@test.com");
  await page.getByTestId("login-password").fill("testpassword123");
  await page.getByTestId("login-submit").click();
  await expectPostPasswordLoginUrl(page);
}

async function getCsrf(page: import("@playwright/test").Page) {
  const csrfResponse = await page.request.get(`/api/v1/auth/csrf`);
  const csrfData = (await csrfResponse.json()) as { csrf_token?: string };
  return csrfData.csrf_token ?? "";
}

test.describe("Manual compare selection (Task 12)", () => {
  test("legacy /posts route redirects to /content", async ({ page }) => {
    await loginAsEditor(page);
    await page.goto("/posts");
    await expect(page).toHaveURL("/content");
    await page.screenshot({
      path: evidencePath("task-12-posts-page.png"),
    });
  });

  test("content page exposes the new content entrypoint", async ({ page }) => {
    await loginAsEditor(page);
    await page.goto("/content");

    await expect(page.getByRole("heading", { name: /Content/i })).toBeVisible();
    await expect(
      page.getByRole("button", { name: /New content/i }),
    ).toBeVisible();

    await page.screenshot({
      path: evidencePath("task-12-submit-disabled.png"),
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
      evidencePath("task-12-draft-post-api.txt"),
      evidence,
      "utf-8",
    );
  });
});
