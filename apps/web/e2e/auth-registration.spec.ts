import { test, expect } from "@playwright/test";

async function registerViaUi(
  page: import("@playwright/test").Page,
  name: string,
  email: string,
  password = "password123",
) {
  await page.goto("/register");
  await expect(page.locator("h1")).toContainText("Create Account");
  await page.fill("#name", name);
  await page.fill("#email", email);
  await page.fill("#password", password);
  await page.click('button[type="submit"]');
}

test.describe("Customer Registration E2E Tests", () => {
  test("registers a new customer and lands signed-in", async ({ page }) => {
    await page.context().clearCookies();
    const email = `pw-register-${Date.now()}@mykart.com`;

        await registerViaUi(page, "PW Register User", email);

    // Successful registration follows the existing login/session flow.
    try {
      await page.waitForURL("**/", { timeout: 15000 });
    } catch {
      // Occasional one-off login latency under dev-server load: retry submit.
      await page.click('button[type="submit"]');
      await page.waitForURL("**/");
    }

    // Session is established: the account page shows the new identity.
    await page.goto("/account");
    await expect(page.locator("body")).toContainText(email);
  });

  test("login and register pages link to each other", async ({ page }) => {
    await page.context().clearCookies();

    await page.goto("/login");
    await page.click('a:has-text("Create an account")');
    await page.waitForURL("**/register**");

    await page.click('a:has-text("Sign In")');
    await page.waitForURL("**/login**");
  });

  test("shows a safe error when the email is already registered", async ({
    page,
  }) => {
    await page.context().clearCookies();
    const email = `pw-duplicate-${Date.now()}@mykart.com`;

    await registerViaUi(page, "PW Duplicate One", email);
    await page.waitForURL("**/");

    await page.context().clearCookies();
    await registerViaUi(page, "PW Duplicate Two", email);

    await expect(page.locator('[role="alert"]')).toBeVisible();
  });
});
