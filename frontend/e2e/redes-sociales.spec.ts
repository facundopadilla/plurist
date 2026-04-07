import { test, expect } from "@playwright/test";

test.describe("Redes Sociales page", () => {
  test("shows redes-sociales page when navigating to /settings/redes-sociales", async ({
    page,
  }) => {
    // Login as owner
    await page.goto("/login");
    await page.getByTestId("login-email").fill("owner@test.com");
    await page.getByTestId("login-password").fill("testpassword123");
    await page.getByTestId("login-submit").click();
    await expect(page).toHaveURL("/");

    // Navigate to redes sociales
    await page.goto("/settings/redes-sociales");
    await expect(page).toHaveURL("/settings/redes-sociales");

    // Page should render the three network cards
    await expect(page.getByText("LinkedIn")).toBeVisible();
    await expect(page.getByText("X (Twitter)")).toBeVisible();
    await expect(page.getByText("Instagram")).toBeVisible();
  });

  test("nav Settings link goes to redes-sociales", async ({ page }) => {
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

    // Intercept the navigation to avoid actually hitting Twitter
    let redirected = false;
    page.on("request", (req) => {
      if (req.url().includes("/api/v1/integrations/oauth/x/start")) {
        redirected = true;
      }
    });

    // Click connect for X — the button triggers window.location.href redirect
    const connectButtons = page.getByRole("button", { name: "Conectar" });
    // Find the one associated with X (second button)
    await connectButtons.nth(1).click();

    // Give a moment for the navigation to start
    await page.waitForTimeout(300);
    expect(redirected).toBe(true);
  });
});
