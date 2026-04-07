import { mkdirSync } from "node:fs";
import { join } from "node:path";

import { request } from "@playwright/test";

async function globalSetup() {
  // E2E specs write optional artifacts under repo-root .sisyphus/evidence (gitignored).
  mkdirSync(join(__dirname, "..", "..", ".sisyphus", "evidence"), {
    recursive: true,
  });

  const backendUrl = process.env.BACKEND_URL ?? "http://backend:8000";
  const context = await request.newContext();
  const meResponse = await context.get(`${backendUrl}/api/v1/auth/csrf`);
  const data = (await meResponse.json()) as { csrf_token?: string };
  const csrf = data.csrf_token ?? "";

  await context.post(`${backendUrl}/api/v1/auth/dev-seed`, {
    headers: {
      "X-CSRF-Token": csrf,
    },
  });

  await context.dispose();
}

export default globalSetup;
