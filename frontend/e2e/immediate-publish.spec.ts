import { test, expect } from "@playwright/test";
import { promises as fs } from "node:fs";

async function login(page: import("@playwright/test").Page, email: string) {
  await page.goto("/login");
  await page.getByTestId("login-email").fill(email);
  await page.getByTestId("login-password").fill("testpassword123");
  await page.getByTestId("login-submit").click();
  await expect(page).toHaveURL("/");
}

test.describe("Immediate publish flow", () => {
  test("full publish flow: create → submit → approve → publish", async ({
    page,
  }) => {
    // Step 1: editor creates a draft post
    await login(page, "editor@test.com");

    const createResp = await page.request.post("/api/v1/content/", {
      data: {
        title: "E2E Publish Test Post",
        body_text: "This post will go through the full publish flow.",
        target_networks: ["linkedin"],
      },
    });
    expect(createResp.status()).toBe(201);
    const post = (await createResp.json()) as { id: number; status: string };
    expect(post.status).toBe("draft");
    const postId = post.id;

    // Step 2: editor submits post for approval
    const submitResp = await page.request.post(
      `/api/v1/content/${postId}/submit`,
    );
    expect(submitResp.status()).toBe(200);

    // Step 3: owner approves the post
    await login(page, "owner@test.com");
    const approveResp = await page.request.post(
      `/api/v1/content/${postId}/approve`,
      {
        data: { reason: "" },
      },
    );
    expect(approveResp.status()).toBe(200);

    // Step 4: publisher publishes the post
    await login(page, "publisher@test.com");
    const idempotencyKey = `e2e-publish-${postId}-${Date.now()}`;
    const publishResp = await page.request.post(
      `/api/v1/publishing/publish-now/${postId}`,
      {
        headers: { "Idempotency-Key": idempotencyKey },
      },
    );
    expect(publishResp.status()).toBe(202);
    const published = (await publishResp.json()) as {
      post_status: string;
      attempts: unknown[];
    };

    const evidence = [
      `post_id=${postId}`,
      `idempotency_key=${idempotencyKey}`,
      `final_status=${published.post_status}`,
      `attempts=${published.attempts?.length ?? 0}`,
    ].join("\n");
    await fs.writeFile(
      "../.sisyphus/evidence/task-17-publish-flow.txt",
      evidence,
      "utf-8",
    );
  });

  test("idempotency: same Idempotency-Key returns same attempt", async ({
    page,
  }) => {
    await login(page, "editor@test.com");

    const createResp = await page.request.post("/api/v1/content/", {
      data: {
        title: "E2E Idempotency Test Post",
        body_text: "Testing idempotent publish.",
        target_networks: ["linkedin"],
      },
    });
    expect(createResp.status()).toBe(201);
    const post = (await createResp.json()) as { id: number };
    const postId = post.id;

    await page.request.post(`/api/v1/content/${postId}/submit`);

    await login(page, "owner@test.com");
    await page.request.post(`/api/v1/content/${postId}/approve`, {
      data: { reason: "" },
    });

    await login(page, "publisher@test.com");
    const idempotencyKey = `e2e-idem-${postId}`;

    const firstResp = await page.request.post(
      `/api/v1/publishing/publish-now/${postId}`,
      { headers: { "Idempotency-Key": idempotencyKey } },
    );
    expect(firstResp.status()).toBe(202);
    const firstBody = (await firstResp.json()) as {
      post_id: number;
      attempts: { id: number }[];
    };

    const secondResp = await page.request.post(
      `/api/v1/publishing/publish-now/${postId}`,
      { headers: { "Idempotency-Key": idempotencyKey } },
    );
    expect(secondResp.status()).toBe(202);
    const secondBody = (await secondResp.json()) as {
      post_id: number;
      attempts: { id: number }[];
    };

    const firstIds = firstBody.attempts.map((a) => a.id).sort();
    const secondIds = secondBody.attempts.map((a) => a.id).sort();
    expect(secondIds).toEqual(firstIds);

    const evidence = [
      `post_id=${postId}`,
      `idempotency_key=${idempotencyKey}`,
      `attempts_first=${JSON.stringify(firstIds)}`,
      `attempts_second=${JSON.stringify(secondIds)}`,
      `match=${JSON.stringify(firstIds) === JSON.stringify(secondIds)}`,
    ].join("\n");
    await fs.writeFile(
      "../.sisyphus/evidence/task-17-idempotency.txt",
      evidence,
      "utf-8",
    );
  });
});
