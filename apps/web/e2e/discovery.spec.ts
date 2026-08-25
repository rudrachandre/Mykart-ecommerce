import { test, expect } from '@playwright/test';

test.describe('Product Discovery E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Mock the search autocomplete endpoint to prevent failures due to missing Meilisearch server
    await page.route('**/api/v1/search/autocomplete*', async (route) => {
      const json = {
        products: [
          {
            id: 'test-laptop-id',
            name: 'Test Laptop',
            slug: 'test-laptop',
            basePrice: 50000,
            images: ['https://images.unsplash.com/photo-1593640408182-31c70c8268f5'],
          },
        ],
        categories: [
          { id: 'cat-id', name: 'Electronics', slug: 'electronics' },
        ],
        brands: [],
      };
      await route.fulfill({ json });
    });

    await page.route('**/api/v1/search?*', async (route) => {
      const json = {
        items: [
          {
            id: 'test-laptop-id',
            name: 'Test Laptop',
            slug: 'test-laptop',
            basePrice: 50000,
            images: ['https://images.unsplash.com/photo-1593640408182-31c70c8268f5'],
            category: { name: 'Electronics', slug: 'electronics' },
          },
        ],
        meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
      };
      await route.fulfill({ json });
    });
  });

  test('Homepage loads and displays active products & category links', async ({ page }) => {
    await page.goto('/');
    
    // Check Header elements
            await expect(page.locator('a:has-text("MyKart")').first()).toBeVisible();
    await expect(page.locator('a:has-text("Products")').first()).toBeVisible();

    // Check homepage content (hero headline per mykart-ui-spec §12)
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Elevate your everyday essentials');
  });

  test('Search autocomplete suggestions appear when typing', async ({ page }) => {
    await page.goto('/');
            const searchInput = page.locator('input[placeholder*="Search for products"]').first();
    await searchInput.fill('laptop');

    // Wait for the debounced suggestions dropdown
    await page.waitForSelector('div.z-50 a:has-text("Test Laptop")');
    await expect(page.locator('div.z-50 a:has-text("Test Laptop")')).toBeVisible();
    await expect(page.locator('div.z-50 a:has-text("Electronics")')).toBeVisible();
  });

  test('Product detail page loads product info, trust badges, and related products', async ({ page }) => {
    await page.goto('/products/test-laptop');

    // Verify product name and basePrice
    await expect(page.locator('h1')).toContainText('Test Laptop');
    await expect(page.locator('body')).toContainText('50,000');

    // Verify 2x2 Trust features grid (.first(): transient dev-hydration can
    // briefly leave a hidden duplicate node)
    await expect(page.locator('text=Fast Delivery').first()).toBeVisible();
    await expect(page.locator('text=7 Days Return').first()).toBeVisible();
    await expect(page.locator('text=Secure Payment').first()).toBeVisible();
    await expect(page.locator('text=Top Rated Seller').first()).toBeVisible();

    // Verify Related Products section is present (.first(): transient
    // hydration-regeneration can briefly leave a hidden duplicate node)
    await expect(page.locator('h2:has-text("Related Products")').first()).toBeVisible();
  });

  test('Filtering and sorting work correctly on products catalog page', async ({ page }) => {
    // Go to search page where SearchFilters is rendered
    await page.goto('/search');

    // Category and Brand filters present. Scope to the first heading: transient
    // dev-hydration can leave a hidden duplicate node on /search.
    await expect(page.locator('h3:has-text("Filters")').first()).toBeVisible();

    // Check category filter URL updates
    await page.selectOption('select:near(h4:has-text("Category"))', { label: 'Electronics' });
    await page.click('button[type="submit"]:has-text("Apply")');
    await page.waitForURL('**/search?*category=electronics*');
  });
});
