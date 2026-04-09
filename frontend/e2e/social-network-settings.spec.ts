import { test, expect } from "@playwright/test";

test.describe("Social network settings (legacy /settings/redes-sociales route)", () => {
  test("shows page when navigating to /settings/redes-sociales", async ({
    page,
  }) => {
    // Login as owner
    await page.goto("/login");
    await page.getByTestId("login-email").fill("owner@test.com");
    await page.getByTestId("login-password").fill("testpassword123");
    await page.getByTestId("login-submit").click();
    await expect(page).toHaveURL("/");

    await page.goto("/settings/redes-sociales");
    await expect(page).toHaveURL("/settings/redes-sociales");

    // Page should render the three network cards
    await expect(page.getByText("LinkedIn")).toBeVisible();
    await expect(page.getByText("X (Twitter)")).toBeVisible();
    await expect(page.getByText("Instagram")).toBeVisible();
  });

  test("nav Settings link goes to /settings/redes-sociales", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.getByTestId("login-email").fill("owner@test.com");
    await page.getByTestId("login-password").fill("testpassword123");
    await page.getByTestId("login-submit").click();
    await expect(page).toHaveURL("/");

    await page.getByTestId("nav-settings").click();
    await expect(page).toHaveURL("/settings/redes-sociales");
  });

  test("connect button for X initiates redirect to twitter", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.getByTestId("login-email").fill("owner@test.com");
    await page.getByTestId("login-password").fill("testpassword123");
    await page.getByTestId("login-submit").click();

    await page.goto("/settings/redes-sociales");

    let redirected = false;
    page.on("request", (req) => {
      if (req.url().includes("/api/v1/integrations/oauth/x/start")) {
        redirected = true;
      }
    });

    const connectButtons = page.getByRole("button", { name: "Connect" });
    await connectButtons.nth(1).click();

    await page.waitForTimeout(300);
    expect(redirected).toBe(true);
  });
});
