import { test, expect } from "@playwright/test";
import { promises as fs } from "node:fs";

async function login(page: import("@playwright/test").Page, email: string) {
  await page.goto("/login");
  await page.getByTestId("login-email").fill(email);
  await page.getByTestId("login-password").fill("testpassword123");
  await page.getByTestId("login-submit").click();
  await expect(page).toHaveURL("/");
}

async function createDraftPost(
  page: import("@playwright/test").Page,
  title: string,
): Promise<number> {
  await login(page, "editor@example.com");
  const resp = await page.request.post("/api/v1/posts/", {
    data: { title, body_text: "Scheduler e2e test body.", target_networks: ["linkedin"] },
  });
  expect(resp.status()).toBe(201);
  const post = (await resp.json()) as { id: number };
  return post.id;
}

async function submitAndApprove(
  page: import("@playwright/test").Page,
  postId: number,
) {
  await login(page, "editor@example.com");
  const submitResp = await page.request.post(`/api/v1/posts/${postId}/submit`);
  expect(submitResp.status()).toBe(200);

  await login(page, "owner@example.com");
  const approveResp = await page.request.post(`/api/v1/posts/${postId}/approve`, {
    data: { reason: "" },
  });
  expect(approveResp.status()).toBe(200);
}

test.describe("Scheduler calendar", () => {
  test("owner can schedule an approved post", async ({ page }) => {
    const postId = await createDraftPost(page, "E2E Schedule Test Post");
    await submitAndApprove(page, postId);

    const scheduledAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const schedResp = await page.request.post("/api/v1/scheduler/entries", {
      data: { draft_post_id: postId, network: "linkedin", scheduled_for: scheduledAt },
    });
    expect(schedResp.status()).toBe(201);

    const entry = (await schedResp.json()) as {
      id: number;
      draft_post_id: number;
      status: string;
    };
    expect(entry.draft_post_id).toBe(postId);
    expect(entry.status).toBe("pending");

    const evidence = `post_id=${postId}\nentry_id=${entry.id}\nstatus=${entry.status}`;
    await fs.writeFile("../.sisyphus/evidence/task-19-schedule-approved.txt", evidence, "utf-8");
  });

  test("editor cannot schedule a post (403)", async ({ page }) => {
    const postId = await createDraftPost(page, "E2E Editor Schedule Forbidden");
    await submitAndApprove(page, postId);

    await login(page, "editor@example.com");
    const scheduledAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const schedResp = await page.request.post("/api/v1/scheduler/entries", {
      data: { draft_post_id: postId, network: "linkedin", scheduled_for: scheduledAt },
    });
    expect(schedResp.status()).toBe(403);

    const evidence = `post_id=${postId}\nstatus=${schedResp.status()}`;
    await fs.writeFile("../.sisyphus/evidence/task-19-editor-forbidden.txt", evidence, "utf-8");
  });

  test("scheduling a non-approved post fails (400)", async ({ page }) => {
    const postId = await createDraftPost(page, "E2E Non-Approved Schedule");

    await login(page, "owner@example.com");
    const scheduledAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const schedResp = await page.request.post("/api/v1/scheduler/entries", {
      data: { draft_post_id: postId, network: "linkedin", scheduled_for: scheduledAt },
    });
    expect(schedResp.status()).toBe(400);

    const evidence = `post_id=${postId}\nstatus=${schedResp.status()}`;
    await fs.writeFile("../.sisyphus/evidence/task-19-non-approved.txt", evidence, "utf-8");
  });
});
