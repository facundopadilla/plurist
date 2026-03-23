import { test, expect } from "@playwright/test";
import { promises as fs } from "node:fs";

async function getCsrf(page: import("@playwright/test").Page) {
  const csrfResponse = await page.request.get(`/api/v1/auth/csrf`);
  const csrfData = (await csrfResponse.json()) as { csrf_token?: string };
  return csrfData.csrf_token ?? "";
}

test.describe("Design bank upload", () => {
  test("owner sees upload controls and can submit a URL ingestion", async ({ page }) => {
    await page.goto("/login");
    await page.getByTestId("login-email").fill("owner@example.com");
    await page.getByTestId("login-password").fill("testpassword123");
    await page.getByTestId("login-submit").click();
    await expect(page).toHaveURL("/");

    await page.goto("/design-bank");
    await expect(page.getByTestId("design-bank-upload-file")).toBeVisible();

    await page.screenshot({ path: "../.sisyphus/evidence/task-8-owner-upload-controls.png" });

    const csrf = await getCsrf(page);

    const response = await page.request.post(`/api/v1/design-bank/sources/url`, {
      data: { url: "https://example.com/brand-asset.png" },
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": csrf,
      },
    });

    const text = `status=${response.status()}\nbody=${await response.text()}`;
    await fs.writeFile("../.sisyphus/evidence/task-8-owner-url-ingest.txt", text, "utf-8");
    expect(response.status()).toBe(201);

    const body = (await response.json()) as { source_type: string; status: string };
    expect(body.source_type).toBe("url");
    expect(body.status).toBe("pending");
  });

  test("publisher sees upload controls absent or disabled", async ({ page }) => {
    await page.goto("/login");
    await page.getByTestId("login-email").fill("publisher@example.com");
    await page.getByTestId("login-password").fill("testpassword123");
    await page.getByTestId("login-submit").click();
    await expect(page).toHaveURL("/");

    await page.goto("/design-bank");

    await page.screenshot({ path: "../.sisyphus/evidence/task-8-publisher-no-upload.png" });

    const uploadControl = page.getByTestId("design-bank-upload-file");
    const isPresent = (await uploadControl.count()) > 0;

    if (isPresent) {
      const isDisabled = await uploadControl.isDisabled();
      expect(isDisabled).toBe(true);
    } else {
      expect(isPresent).toBe(false);
    }

    const csrf = await getCsrf(page);

    const response = await page.request.post(`/api/v1/design-bank/sources/url`, {
      data: { url: "https://example.com/brand-asset.png" },
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": csrf,
      },
    });

    const text = `status=${response.status()}\nbody=${await response.text()}`;
    await fs.writeFile("../.sisyphus/evidence/task-8-publisher-url-ingest-forbidden.txt", text, "utf-8");
    expect(response.status()).toBe(403);
  });
});
