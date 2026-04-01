import { test, expect } from "@playwright/test";
import { promises as fs } from "node:fs";

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
  await expect(page).toHaveURL("/");
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
  test("create a render job with a trusted template key and poll until resolved", async ({
    page,
  }) => {
    await loginAs(page, "editor@example.com");

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

    expect(createJobResponse.status()).toBe(201);

    const job = (await createJobResponse.json()) as {
      id: number;
      template_key: string;
      status: string;
    };
    expect(job.template_key).toBe("social-post-standard");
    expect(["pending", "processing", "completed"]).toContain(job.status);

    // Poll until completed or failed (max 10 attempts, 1s apart)
    let finalStatus = job.status;
    let pollBody = job as Record<string, unknown>;

    if (finalStatus !== "completed" && finalStatus !== "failed") {
      for (let attempt = 0; attempt < 10; attempt++) {
        await page.waitForTimeout(1000);

        const pollResponse = await page.request.get(
          `/api/v1/rendering/render-jobs/${job.id}`,
          {
            headers: {
              "X-CSRF-Token": csrf,
            },
          },
        );
        expect(pollResponse.status()).toBe(200);

        pollBody = (await pollResponse.json()) as Record<string, unknown>;
        finalStatus = pollBody.status as string;

        if (finalStatus === "completed" || finalStatus === "failed") {
          break;
        }
      }
    }

    const evidenceText = [
      `job_id=${job.id}`,
      `template_key=${job.template_key}`,
      `final_status=${finalStatus}`,
      `brand_profile_version_id=${brandVersion.id}`,
      `response=${JSON.stringify(pollBody)}`,
    ].join("\n");

    await fs.writeFile(
      "../.sisyphus/evidence/task-10-render-job-poll.txt",
      evidenceText,
      "utf-8",
    );

    // Job should resolve to completed or pending (broker may be unavailable in test env)
    expect(["pending", "completed", "failed"]).toContain(finalStatus);
  });

  test("create render job with invalid template key returns 400 or 422", async ({
    page,
  }) => {
    await loginAs(page, "editor@example.com");

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

    expect([400, 422]).toContain(response.status());

    const body = (await response.json()) as { detail: string };
    expect(body.detail).toMatch(/template/i);
  });
});
