import { test, expect, Page } from '@playwright/test';

async function loginAsCustomer(page: Page) {
  await page.goto('/login');
  await page.fill('#email', 'test-customer@mykart.com');
  await page.fill('#password', 'password123');
  await page.click('button[type="submit"]');
  try {
    await page.waitForURL('**/', { timeout: 15000 });
  } catch {
    // Occasional one-off login latency under dev-server load: retry submit.
    await page.click('button[type="submit"]');
    await page.waitForURL('**/');
  }
}

test.describe('Notifications System E2E Tests', () => {
  test('Mock Notifications display in dropdown, count updates, and read states', async ({ page }) => {
    // Mock the notifications endpoints
    let mockNotifications = [
      {
        id: 'notif-1',
        title: 'Order Shipped',
        message: 'Your order #123 has been shipped.',
        read: false,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'notif-2',
        title: 'Coupon Expiring',
        message: 'Your coupon code WELCOME10 is expiring soon.',
        read: false,
        createdAt: new Date().toISOString(),
      },
    ];

    await page.route('**/api/v1/notifications', async (route) => {
      await route.fulfill({ json: mockNotifications });
    });

    await page.route('**/api/v1/notifications/*/read', async (route) => {
      const url = route.request().url();
      const id = url.split('/notifications/')[1].split('/read')[0];
      mockNotifications = mockNotifications.map(n => n.id === id ? { ...n, read: true } : n);
      await route.fulfill({ json: { success: true } });
    });

    await page.route('**/api/v1/notifications/read-all', async (route) => {
      mockNotifications = mockNotifications.map(n => ({ ...n, read: true }));
      await route.fulfill({ json: { success: true } });
    });

    // Log in
    await loginAsCustomer(page);

    // Verify Notification Bell displays unread count of 2
    const bellBadge = page.locator('button:has(svg.lucide-bell) span');
    await expect(bellBadge).toContainText('2');

    // Click Bell to open dropdown
    await page.click('button:has(svg.lucide-bell)');
    
    // Verify notifications title and messages
    await expect(page.locator('h3:has-text("Notifications")')).toBeVisible();
    await expect(page.locator('span:has-text("Order Shipped")')).toBeVisible();
    await expect(page.locator('span:has-text("Coupon Expiring")')).toBeVisible();

    // Click "Mark as read" on first notification
    await page.click('button:has-text("Mark as read") >> nth=0');

    // Check that badge updates to 1
    await expect(bellBadge).toContainText('1');

    // Click "Mark all as read"
    await page.click('button:has-text("Mark all as read")');

    // Badge should be hidden/gone
    await expect(bellBadge).not.toBeVisible();
  });
});
