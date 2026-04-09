import { test, expect } from "@playwright/test";
import { promises as fs } from "node:fs";

import { expectPostPasswordLoginUrl } from "./expect-post-login";

async function getCsrf(page: import("@playwright/test").Page) {
  const csrfResponse = await page.request.get(`/api/v1/auth/csrf`);
  const csrfData = (await csrfResponse.json()) as { csrf_token?: string };
  return csrfData.csrf_token ?? "";
}

async function loginAs(page: import("@playwright/test").Page, email: string) {
  await page.goto("/login");
  await page.getByTestId("login-email").fill(email);
  await page.getByTestId("login-password").fill("testpassword123");
  await page.getByTestId("login-submit").click();
  await expectPostPasswordLoginUrl(page);
}

async function createBrandProfileVersion(
  page: import("@playwright/test").Page,
  csrf: string,
) {
  const response = await page.request.post(`/api/v1/brand-profile/versions`, {
    data: {
      brand_name: "Render Test Brand",
      primary_color: "#0055FF",
      slogans: ["Test slogan"],
    },
    headers: {
      "Content-Type": "application/json",
      "X-CSRF-Token": csrf,
    },
  });
  expect(response.status()).toBe(201);
  return (await response.json()) as { id: number; version: number };
}

test.describe("Render preview", () => {
  test("server-side render jobs endpoint returns 410 (use canvas export)", async ({
    page,
  }) => {
    await loginAs(page, "editor@test.com");

    const csrf = await getCsrf(page);

    const brandVersion = await createBrandProfileVersion(page, csrf);

    const createJobResponse = await page.request.post(
      `/api/v1/rendering/render-jobs`,
      {
        data: {
          template_key: "social-post-standard",
          brand_profile_version_id: brandVersion.id,
        },
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrf,
        },
      },
    );

    expect(createJobResponse.status()).toBe(410);
    const goneBody = (await createJobResponse.json()) as { detail?: string };
    expect(goneBody.detail ?? "").toMatch(/canvas export/i);

    await fs.writeFile(
      "../.sisyphus/evidence/task-10-render-job-gone.txt",
      `status=${createJobResponse.status()}\nbody=${JSON.stringify(goneBody)}`,
      "utf-8",
    );
  });

  test("create render job with invalid template key returns 400 or 422", async ({
    page,
  }) => {
    await loginAs(page, "editor@test.com");

    const csrf = await getCsrf(page);

    const brandVersion = await createBrandProfileVersion(page, csrf);

    const response = await page.request.post(`/api/v1/rendering/render-jobs`, {
      data: {
        template_key: "not-a-real-template-key",
        brand_profile_version_id: brandVersion.id,
      },
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": csrf,
      },
    });

    const evidenceText = `status=${response.status()}\nbody=${await response.text()}`;
    await fs.writeFile(
      "../.sisyphus/evidence/task-10-invalid-template-key.txt",
      evidenceText,
      "utf-8",
    );

    expect([400, 422, 410]).toContain(response.status());

    const body = (await response.json()) as { detail?: string };
    expect(body.detail ?? "").toMatch(/template|canvas export/i);
  });
});
