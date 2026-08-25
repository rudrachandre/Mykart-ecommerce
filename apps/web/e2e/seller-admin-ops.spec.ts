import { test, expect, Page } from '@playwright/test';

async function loginAsSeller1(page: Page) {
  await page.goto('/login');
  await page.fill('#email', 'test-seller@mykart.com');
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

async function loginAsSeller2(page: Page) {
  await page.goto('/login');
  await page.fill('#email', 'test-seller2@mykart.com');
  await page.fill('#password', 'password123');
  await page.click('button[type="submit"]');
  try {
    await page.waitForURL('**/', { timeout: 15000 });
  } catch {
    await page.click('button[type="submit"]');
    await page.waitForURL('**/');
  }
}

async function loginAsAdmin(page: Page) {
  await page.goto('/login');
  await page.fill('#email', 'test-admin@mykart.com');
  await page.fill('#password', 'password123');
  await page.click('button[type="submit"]');
  try {
    await page.waitForURL('**/', { timeout: 15000 });
  } catch {
    await page.click('button[type="submit"]');
    await page.waitForURL('**/');
  }
}

test.describe('Seller & Admin Operations + Security Boundaries E2E Tests', () => {
  test('Seller product lifecycle management (Create, Edit, Delete)', async ({ page }) => {
    await loginAsSeller1(page);

    // 1. Visit Seller Products page
    await page.goto('/seller/products');
    await expect(page.locator('h1')).toContainText('My Products');

    // 2. Add a new product
    await page.click('button:has-text("Add New Product")');
    await page.waitForURL('**/seller/products/new');

    // Unique identifiers per run: the API enforces unique slugs/SKUs, so a
    // leftover artifact from an aborted earlier run must not break isolation.
    const uid = Date.now();
    await page.fill('input[name="name"]', 'Seller E2E Laptop');
    await page.fill('input[name="slug"]', `seller-e2e-laptop-${uid}`);
    await page.fill('textarea[name="description"]', 'Premium laptop created during E2E tests.');
    await page.fill('input[name="basePrice"]', '60000');
    await page.selectOption('select[name="categoryId"]', { label: 'Electronics' });

    // Fill Variant details. Labels are siblings of their inputs, so use
    // exact-text adjacent selectors — ":near()" previously matched the
    // top-level Base Price field, leaving variant price at 0 (API 400).
    await page.fill('label:text-is("SKU") + input[type="text"]', `SELLER-E2E-LAPTOP-${uid}`);
    await page.fill('label:text-is("Price") + input[type="number"]', '60000');
    await page.fill('label:text-is("Quantity") + input[type="number"]', '5');

    await page.click('button[type="submit"]:has-text("Create Product")');
    await page.waitForURL('**/seller/products');

    // 3. Edit product
    await page.click('a:has-text("Edit")');
    await page.waitForSelector('input[name="basePrice"]');
    await page.fill('input[name="basePrice"]', '65000');
    await page.click('button[type="submit"]:has-text("Update Product")');
    await page.waitForURL('**/seller/products');

    // 4. Delete product
    // Click Delete button and handle confirmation dialog
    page.on('dialog', async dialog => {
      expect(dialog.message()).toContain('Are you sure you want to delete this product?');
      await dialog.accept();
    });
    await page.click('button:has-text("Delete")');
    
    // Wait for success toast and verify it is removed from lists.
    // NOTE: the seller-side ProductActions component does NOT fire a success
    // toast on delete (it calls router.refresh(); only failures toast), so we
    // assert the real outcome — the product disappearing from the list.
    await expect(page.locator('body')).not.toContainText('Seller E2E Laptop', { timeout: 30000 });
  });

  test('Seller ownership isolation security check', async ({ page, request }) => {
    // 1. Log in as Seller 1 to get token
    await loginAsSeller1(page);
    const cookies = await page.context().cookies();
    const token = cookies.find(c => c.name === 'accessToken')?.value;
    expect(token).toBeDefined();

    // 2. Fetch seller 1 details
    const seller1ProfileRes = await request.get('http://localhost:3001/api/v1/sellers/profile', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const seller1Profile = await seller1ProfileRes.json();
    const seller1Id = seller1Profile.id;

    // 3. Log in as Seller 2 to get token
    await loginAsSeller2(page);
    const cookies2 = await page.context().cookies();
    const token2 = cookies2.find(c => c.name === 'accessToken')?.value;
    
    // Get seller 2 profile
    const seller2ProfileRes = await request.get('http://localhost:3001/api/v1/sellers/profile', {
      headers: { Authorization: `Bearer ${token2}` }
    });
    const seller2Profile = await seller2ProfileRes.json();
    const seller2Id = seller2Profile.id;

    // 4. Attempt to create a product from Seller 2's session spoofing seller1Id
    // The backend should ignore the spoofed sellerId and enforce seller2Id
    const categoryRes = await request.get('http://localhost:3001/api/v1/categories', {
      headers: { Authorization: `Bearer ${token2}` }
    });
    const categories = await categoryRes.json();
    const categoryId = categories[0].id;

    const spoofedProductRes = await request.post('http://localhost:3001/api/v1/products', {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token2}`
      },
      data: {
        name: 'Spoofed Laptop',
        slug: `spoofed-laptop-${Date.now()}`,
        description: 'Trying to spoof sellerId',
        basePrice: 40000,
        categoryId: categoryId,
        sellerId: seller1Id, // Spoofed!
        variants: [
          { sku: `SPOOF-SKU-${Date.now()}`, price: 40000, inventory: { quantity: 1 } }
        ]
      }
    });

    expect(spoofedProductRes.status()).toBe(201);
    const createdProduct = await spoofedProductRes.json();
    
    // Assert that the product actually belongs to seller2Id (enforcing token identity) rather than seller1Id!
    expect(createdProduct.sellerId).toBe(seller2Id);
    expect(createdProduct.sellerId).not.toBe(seller1Id);
  });

  test('Customer cannot access Admin or Seller APIs (RBAC)', async ({ page, request }) => {
    // Get Customer token
    await page.goto('/login');
    await page.fill('#email', 'test-customer@mykart.com');
    await page.fill('#password', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/');
    const cookies = await page.context().cookies();
    const token = cookies.find(c => c.name === 'accessToken')?.value;

    // Access admin endpoint -> should return 403 Forbidden
    const adminRes = await request.get('http://localhost:3001/api/v1/admin/users', {
      headers: { Authorization: `Bearer ${token}` }
    });
    expect(adminRes.status()).toBe(403);

    // Access seller endpoint as a customer -> RolesGuard rejects with 403
    // Forbidden. (The API deliberately does not leak existence via 404 here;
    // this matches the ADMIN 403 contract asserted across the API e2e suite.)
    const sellerRes = await request.get('http://localhost:3001/api/v1/sellers/profile', {
      headers: { Authorization: `Bearer ${token}` }
    });
    expect(sellerRes.status()).toBe(403);
  });

  test('Admin Seller Management and Manual Product Listing', async ({ page, request }) => {
    await loginAsAdmin(page);

    // Go to Admin Sellers list
    await page.goto('/admin/sellers');
    await expect(page.locator('h1')).toContainText('Sellers');

    // Click Manage on first seller
    await page.click('button:has-text("Manage")');
    await page.waitForURL('**/admin/sellers/*');
    // The detail page's h1 is the store name; the reliable landmark is the
    // manual-listing link rendered in the header actions.
    const listManually = page.locator('a:has-text("List Product Manually")');
    await expect(listManually).toBeVisible();

    // Click List Product Manually
    await listManually.click();
    await page.waitForURL('**/admin/sellers/*/products/new');

    const uniqueSlug = `admin-manual-laptop-${Date.now()}`;
    await page.fill('input[name="name"]', 'Admin Manual Laptop');
    await page.fill('input[name="slug"]', uniqueSlug);
    await page.fill('textarea[name="description"]', 'Laptop created manually by admin.');
    await page.fill('input[name="basePrice"]', '70000');
    await page.selectOption('select[name="categoryId"]', { label: 'Electronics' });

    // Fill Variant details (exact-label selectors; see note above)
    await page.fill('label:text-is("SKU") + input[type="text"]', `ADMIN-MANUAL-${Date.now()}`);
    await page.fill('label:text-is("Price") + input[type="number"]', '70000');
    await page.fill('label:text-is("Quantity") + input[type="number"]', '3');

    await page.click('button[type="submit"]:has-text("Create Product")');

    // Should redirect back to Seller Details page and see the product in their lists.
    // The detail page fetches its data client-side ("Loading seller..." state);
    // wait for that to resolve before asserting the new product is listed.
    await page.waitForURL('**/admin/sellers/*');
    await expect(page.getByText('Loading seller...')).toBeHidden({ timeout: 20000 });
    await expect(page.locator('body')).toContainText('Admin Manual Laptop', { timeout: 15000 });
  });
});
