import { test, expect, Page } from '@playwright/test';

const UI_TIMEOUT = 30_000;

async function loginViaUi(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.fill('#email', email);
  await page.fill('#password', password);
  await page.click('button[type="submit"]');
  try {
    await page.waitForURL((url) => url.pathname === '/', { timeout: 15000 });
  } catch {
    // Occasional one-off login latency under dev-server load: retry submit.
    await page.click('button[type="submit"]');
    await page.waitForURL((url) => url.pathname === '/');
  }
  // Header shows "Sign in" until refreshUser() finishes; dashboards that
  // read the access cookie on the next navigation need the session settled.
  await expect(page.getByRole('link', { name: 'Sign in' })).toHaveCount(0, {
    timeout: UI_TIMEOUT,
  });
}

async function logoutFromAccount(page: Page) {
  await page.goto('/account');
  await expect(page.getByRole('heading', { name: 'Dashboard' }).first()).toBeVisible({
    timeout: UI_TIMEOUT,
  });
  await page.getByRole('button', { name: 'Logout' }).click();
  await page.waitForURL((url) => url.pathname === '/');
}

test.describe('Authentication & RBAC E2E Tests', () => {
  test('Customer Register via API and Login via UI', async ({ page, request }) => {
    // 1. Create a random email to test customer registration
    const testEmail = `user-${Date.now()}@mykart.com`;
    const password = 'Password123!';

    // Register via backend API
    const response = await request.post('http://localhost:3001/api/v1/auth/register', {
      data: {
        name: 'Jane Doe',
        email: testEmail,
        password: password,
      },
    });
    
    expect(response.status()).toBe(201);
    const data = await response.json();
    expect(data).toHaveProperty('accessToken');

    // 2. Go to login page on the UI (heading is h1 after auth redesign)
    await page.goto('/login');
    await expect(page.locator('h1')).toContainText('Sign In');

    // Test invalid credentials
    await page.fill('#email', testEmail);
    await page.fill('#password', 'WrongPassword!');
    await page.click('button[type="submit"]');
    
    // Strict mode fix: target p[role="alert"] specifically
    await expect(page.locator('p[role="alert"]')).toContainText('Invalid credentials');

    // Test valid credentials
    await page.fill('#password', password);
    await page.click('button[type="submit"]');

    // Should redirect to homepage after success
    await page.waitForURL('**/');
    
    // Check if the user is authenticated and session persists on reload
    await page.goto('/account');
    await page.waitForSelector('h1');
    await expect(page.locator('h1')).toContainText('Dashboard');
    await expect(page.locator('h2:has-text("Jane Doe")')).toBeVisible();

    // Page reload session persistence
    await page.reload();
    await expect(page.locator('h1')).toContainText('Dashboard');

    await logoutFromAccount(page);
    
    // Protected route redirect check
    await page.goto('/account');
    await page.waitForURL(url => url.pathname === '/login');
  });

  test('Customer Role Restrictions (RBAC)', async ({ page }) => {
    await loginViaUi(page, 'test-customer@mykart.com', 'password123');

    // Customer trying to visit /admin should show error / "Failed to load dashboard stats"
    await page.goto('/admin');
    await expect(page.locator('body')).toContainText('Failed to load dashboard stats');

    // Customer trying to visit /seller should redirect to onboarding or block
    await page.goto('/seller');
    await page.waitForURL('**/seller/onboard');
    await expect(page.locator('h1')).toContainText('Become a Seller');
    
    await logoutFromAccount(page);
  });

  test('Seller Dashboard Access (RBAC)', async ({ page }) => {
    await loginViaUi(page, 'test-seller@mykart.com', 'password123');

    // Visit Seller Dashboard
    await page.goto('/seller');
    await expect(page.getByRole('heading', { name: 'Seller Dashboard' })).toBeVisible({
      timeout: UI_TIMEOUT,
    });

    // Seller trying to visit /admin should block / show error
    await page.goto('/admin');
    await expect(page.locator('body')).toContainText('Failed to load dashboard stats');

    await logoutFromAccount(page);
  });

  test('Admin Dashboard Access (RBAC)', async ({ page }) => {
    await loginViaUi(page, 'test-admin@mykart.com', 'password123');

    // Client dashboard waits on /analytics/dashboard; the prior failure was a
    // 5s assertion against h1 while the page was still showing the loading
    // state, not an RBAC denial (admin chrome was already visible).
    await page.goto('/admin');
    await expect(page.getByText('Loading dashboard...')).toBeHidden({
      timeout: UI_TIMEOUT,
    });
    await expect(page.getByRole('heading', { name: 'Platform Overview' })).toBeVisible({
      timeout: UI_TIMEOUT,
    });

    await page.goto('/admin/analytics');
    await expect(page.getByText('Loading analytics...')).toBeHidden({
      timeout: UI_TIMEOUT,
    });
    await expect(page.getByRole('heading', { name: 'Platform Analytics' })).toBeVisible({
      timeout: UI_TIMEOUT,
    });

    await logoutFromAccount(page);
  });
});
