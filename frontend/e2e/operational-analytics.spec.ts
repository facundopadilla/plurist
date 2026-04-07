import { test, expect } from "@playwright/test";
import { promises as fs } from "node:fs";

async function getCsrf(page: import("@playwright/test").Page) {
  const csrfResponse = await page.request.get(`/api/v1/auth/csrf`);
  const csrfData = (await csrfResponse.json()) as { csrf_token?: string };
  return csrfData.csrf_token ?? "";
}

async function login(page: import("@playwright/test").Page, email: string) {
  await page.goto("/login");
  await page.getByTestId("login-email").fill(email);
  await page.getByTestId("login-password").fill("testpassword123");
  await page.getByTestId("login-submit").click();
  await expect(page).toHaveURL("/");
}

test.describe("Operational analytics", () => {
  test("owner receives workflow counters from analytics summary", async ({
    page,
  }) => {
    await login(page, "owner@test.com");
    const csrf = await getCsrf(page);

    const resp = await page.request.get(`/api/v1/analytics/summary`, {
      headers: { "X-CSRF-Token": csrf },
    });
    expect(resp.status()).toBe(200);

    const body = (await resp.json()) as Record<string, unknown>;

    // Must contain workflow-level counters
    expect(body).toHaveProperty("publish_requested");
    expect(body).toHaveProperty("publish_succeeded");
    expect(body).toHaveProperty("publish_failed");
    expect(body).toHaveProperty("approval_requested");
    expect(body).toHaveProperty("approval_approved");
    expect(body).toHaveProperty("approval_rejected");

    const evidence = [
      `status=${resp.status()}`,
      `keys=${Object.keys(body).join(",")}`,
      `body=${JSON.stringify(body)}`,
    ].join("\n");
    await fs.writeFile(
      "../.sisyphus/evidence/task-18-analytics-summary.txt",
      evidence,
      "utf-8",
    );
  });

  test("analytics summary does NOT contain engagement metrics", async ({
    page,
  }) => {
    await login(page, "owner@test.com");
    const csrf = await getCsrf(page);

    const resp = await page.request.get(`/api/v1/analytics/summary`, {
      headers: { "X-CSRF-Token": csrf },
    });
    expect(resp.status()).toBe(200);

    const body = (await resp.json()) as Record<string, unknown>;

    // Engagement metrics belong to a future milestone — must be absent
    expect(body).not.toHaveProperty("likes");
    expect(body).not.toHaveProperty("impressions");
    expect(body).not.toHaveProperty("followers");

    const keys = Object.keys(body).join(",");
    await fs.writeFile(
      "../.sisyphus/evidence/task-18-analytics-no-engagement.txt",
      `response_keys=${keys}`,
      "utf-8",
    );
  });
});
