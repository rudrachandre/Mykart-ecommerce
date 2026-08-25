import { test, expect } from '@playwright/test';

test.describe('Responsive Layout & Smoke Tests', () => {
  test('Homepage and Header elements adaptive check', async ({ page }) => {
    await page.goto('/');
    const width = page.viewportSize()?.width || 1440;

        // Header logo should always be visible
    await expect(page.locator('a:has-text("MyKart")').first()).toBeVisible();

    // Search bar should be visible on all viewports
    await expect(page.locator('input[placeholder*="Search for products"]').first()).toBeVisible();

    // Navigation links visibility depends on viewport size
    if (width < 1024) {
      // Desktop nav links should be hidden on tablet/mobile
      await expect(page.locator('a:has-text("Products")').first()).not.toBeVisible();
    } else {
      // Visible on desktop
      await expect(page.locator('a:has-text("Products")').first()).toBeVisible();
    }
  });

  test('Product details page responsiveness', async ({ page }) => {
    await page.goto('/products/test-laptop');
    
    // Product details are rendered correctly
    await expect(page.locator('h1')).toContainText('Test Laptop');
    
    // Trust Badges grid is present (.first(): transient dev-hydration duplicates)
    await expect(page.locator('text=Fast Delivery').first()).toBeVisible();
    await expect(page.locator('text=Secure Payment').first()).toBeVisible();
  });

  test('Cart Drawer overlay opens correctly', async ({ page }) => {
    await page.goto('/');
    
    // Open Cart Drawer
    await page.click('button:has(svg.lucide-shopping-bag)');
    
    // Drawer title should be visible
    await expect(page.locator('h2:has-text("Your Cart")')).toBeVisible();
  });
});
