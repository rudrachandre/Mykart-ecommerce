const http = require('http');

async function testApi(name, url, options = {}) {
  try {
    const res = await fetch(url, options);
    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch(e) { data = text; }
    console.log(`[${name}] Status: ${res.status}`);
    return { status: res.status, data };
  } catch (error) {
    console.log(`[${name}] Error: ${error.message}`);
    return { status: 500, error: error.message };
  }
}

async function run() {
  console.log('--- STARTING COMPREHENSIVE BACKEND VERIFICATION ---');

  // 1. AUTH: Admin Login
  const adminAuth = await testApi('Auth: Admin Login', 'http://localhost:3001/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@example.com', password: 'password123' })
  });
  const adminToken = adminAuth.data.accessToken;

  // 2. AUTH: Customer Login
  const customerAuth = await testApi('Auth: Customer Login', 'http://localhost:3001/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'customer@example.com', password: 'password123' })
  });
  const customerToken = customerAuth.data.accessToken;

  // 3. AUTH: Seller Login
  const sellerAuth = await testApi('Auth: Seller Login', 'http://localhost:3001/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'seller@example.com', password: 'password123' })
  });
  const sellerToken = sellerAuth.data.accessToken;

  // 4. USER/PROFILE
  await testApi('Profile: Customer', 'http://localhost:3001/api/v1/users/me', {
    headers: { 'Authorization': `Bearer ${customerToken}` }
  });

  // 5. PRODUCTS
  const products = await testApi('Products: List', 'http://localhost:3001/api/v1/products');
  const productId = products.data.items?.[0]?.id;
  const productSlug = products.data.items?.[0]?.slug;
  if (productSlug) {
    await testApi('Products: Detail', `http://localhost:3001/api/v1/products/${productSlug}`);
  }

  // 6. WISHLIST
  if (productId) {
    await testApi('Wishlist: Add', 'http://localhost:3001/api/v1/wishlist/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${customerToken}` },
      body: JSON.stringify({ productId })
    });
  }
  const wishlist = await testApi('Wishlist: Get', 'http://localhost:3001/api/v1/wishlist', {
    headers: { 'Authorization': `Bearer ${customerToken}` }
  });
  if (wishlist.data.items?.[0]) {
    await testApi('Wishlist: Remove', `http://localhost:3001/api/v1/wishlist/items/${wishlist.data.items[0].id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${customerToken}` }
    });
  }

  // 7. SEARCH
  await testApi('Search: Query', 'http://localhost:3001/api/v1/search?q=phone');

  // 8. NOTIFICATIONS
  await testApi('Notifications: Get', 'http://localhost:3001/api/v1/notifications', {
    headers: { 'Authorization': `Bearer ${customerToken}` }
  });

  // 9. SELLER
  await testApi('Seller: Dashboard', 'http://localhost:3001/api/v1/seller/dashboard', {
    headers: { 'Authorization': `Bearer ${sellerToken}` }
  });

  // 10. ADMIN
  await testApi('Admin: Users (As Admin)', 'http://localhost:3001/api/v1/admin/users', {
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  await testApi('Admin: Users (As Customer)', 'http://localhost:3001/api/v1/admin/users', {
    headers: { 'Authorization': `Bearer ${customerToken}` }
  });

}

run().catch(console.error);
