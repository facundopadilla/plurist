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
  profileData: Record<string, unknown>,
) {
  return page.request.post(`/api/v1/brand-profile/versions`, {
    data: profileData,
    headers: {
      "Content-Type": "application/json",
      "X-CSRF-Token": csrf,
    },
  });
}

test.describe("Brand profile curation", () => {
  test("editor creates a brand profile version and it appears in the version list", async ({
    page,
  }) => {
    await loginAs(page, "editor@example.com");

    const csrf = await getCsrf(page);

    const createResponse = await createBrandProfileVersion(page, csrf, {
      brand_name: "Acme Corp",
      voice_notes: "Bold and direct",
      primary_color: "#FF0000",
      slogans: ["Just do it better"],
    });

    const createText = `status=${createResponse.status()}\nbody=${await createResponse.text()}`;
    await fs.writeFile(
      "../.sisyphus/evidence/task-9-create-version.txt",
      createText,
      "utf-8",
    );
    expect(createResponse.status()).toBe(201);

    const created = (await createResponse.json()) as {
      id: number;
      version: number;
      profile_data: Record<string, unknown>;
    };
    expect(created.version).toBeGreaterThan(0);
    expect(created.profile_data.brand_name).toBe("Acme Corp");

    const listResponse = await page.request.get(
      `/api/v1/brand-profile/versions`,
      {
        headers: {
          "X-CSRF-Token": csrf,
        },
      },
    );

    expect(listResponse.status()).toBe(200);

    const versions = (await listResponse.json()) as Array<{
      id: number;
      version: number;
    }>;
    const found = versions.find((v) => v.id === created.id);
    expect(found).toBeDefined();
    expect(found?.version).toBe(created.version);

    const listText = `status=${listResponse.status()}\nfound_id=${created.id}\nbody=${JSON.stringify(versions)}`;
    await fs.writeFile(
      "../.sisyphus/evidence/task-9-version-list.txt",
      listText,
      "utf-8",
    );
  });

  test("old version data is immutable after creating a new version", async ({
    page,
  }) => {
    await loginAs(page, "editor@example.com");

    const csrf = await getCsrf(page);

    const v1Response = await createBrandProfileVersion(page, csrf, {
      brand_name: "Version One Brand",
      voice_notes: "Original voice",
      primary_color: "#111111",
    });
    expect(v1Response.status()).toBe(201);

    const v1 = (await v1Response.json()) as {
      id: number;
      version: number;
      profile_data: Record<string, unknown>;
    };

    const v2Response = await createBrandProfileVersion(page, csrf, {
      brand_name: "Version Two Brand",
      voice_notes: "Updated voice",
      primary_color: "#222222",
    });
    expect(v2Response.status()).toBe(201);

    const v2 = (await v2Response.json()) as {
      id: number;
      version: number;
      profile_data: Record<string, unknown>;
    };

    expect(v2.version).toBeGreaterThan(v1.version);

    const v1CheckResponse = await page.request.get(
      `/api/v1/brand-profile/versions/${v1.id}`,
      {
        headers: {
          "X-CSRF-Token": csrf,
        },
      },
    );
    expect(v1CheckResponse.status()).toBe(200);

    const v1Check = (await v1CheckResponse.json()) as {
      id: number;
      version: number;
      profile_data: Record<string, unknown>;
    };

    expect(v1Check.id).toBe(v1.id);
    expect(v1Check.profile_data.brand_name).toBe("Version One Brand");
    expect(v1Check.profile_data.primary_color).toBe("#111111");

    const immutabilityText = [
      `v1_id=${v1.id} v1_brand_name=${v1Check.profile_data.brand_name}`,
      `v2_id=${v2.id} v2_brand_name=${v2.profile_data.brand_name}`,
      `v1_unchanged=${v1Check.profile_data.brand_name === "Version One Brand"}`,
    ].join("\n");
    await fs.writeFile(
      "../.sisyphus/evidence/task-9-version-immutability.txt",
      immutabilityText,
      "utf-8",
    );
  });
});
