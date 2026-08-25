import { test, expect } from "@playwright/test";

async function registerFreshCustomer(
  page: import("@playwright/test").Page,
  email: string,
) {
  await page.context().clearCookies();
  await page.goto("/register");
  await page.fill("#name", "PW Onboard User");
  await page.fill("#email", email);
  await page.fill("#password", "password123");
    await page.click('button[type="submit"]');
  try {
    await page.waitForURL("**/", { timeout: 15000 });
  } catch {
    await page.click('button[type="submit"]');
    await page.waitForURL("**/");
  }
}

test.describe("Seller Onboarding E2E Tests", () => {
  test("unauthenticated users are redirected to login from onboarding", async ({
    page,
  }) => {
    await page.context().clearCookies();
    await page.goto("/seller/onboard");
    await page.waitForURL("**/login**");
  });

  test("authenticated customer can onboard and reach the seller dashboard", async ({
    page,
  }) => {
    const email = `pw-onboard-${Date.now()}@mykart.com`;
    await registerFreshCustomer(page, email);

    await page.goto("/seller/onboard");
    await expect(page.locator("h1")).toContainText("Become a Seller");

    // Client-side validation: too-short store name is blocked.
    await page.fill("#storeName", "ab");
    await page.click('button[type="submit"]');
    // Scope to the form's own alert paragraph: Next.js also renders a global
    // [role="alert"] route announcer that must not satisfy this assertion.
    await expect(page.locator('p[role="alert"]')).toContainText(
      /at least 3 characters/i,
    );

    // Successful onboarding mints a SELLER-role session and lands on /seller.
    const storeName = `PW Store ${Date.now()}`;
    await page.fill("#storeName", storeName);
    await page.click('button[type="submit"]');
    await page.waitForURL("**/seller");
    await expect(page.locator("body")).toContainText(storeName);
  });
});
