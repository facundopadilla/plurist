import { expect, type Page } from "@playwright/test";

/** Password login sets `location.href` to `/dashboard` (see `LoginPage`). */
export async function expectPostPasswordLoginUrl(page: Page) {
  await expect(page).toHaveURL("/dashboard");
}
