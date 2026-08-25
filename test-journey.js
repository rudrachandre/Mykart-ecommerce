const http = require('http');

async function runFlow() {
  console.log('--- STARTING FLOW ---');
  
  // 1. LOGIN
  console.log('\n--- 1. LOGIN ---');
  const loginRes = await fetch('http://localhost:3001/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@example.com', password: 'password123' })
  });
  console.log('Login Status:', loginRes.status);
  const loginData = await loginRes.json();
  const token = loginData.accessToken;
  const cookie = loginRes.headers.get('set-cookie');
  if (!token) {
    console.error('Login failed!', loginData);
    return;
  }
  console.log('Login succeeded, token received.');

  // 2. PROFILE
  console.log('\n--- 2. PROFILE ---');
  const profileRes = await fetch('http://localhost:3001/api/v1/users/me', {
    headers: { 'Authorization': 'Bearer ' + token }
  });
  console.log('Profile Status:', profileRes.status);
  const profileData = await profileRes.json();
  console.log('Profile User Role:', profileData.role);

  // 3. PRODUCTS
  console.log('\n--- 3. PRODUCTS ---');
  const productsRes = await fetch('http://localhost:3001/api/v1/products');
  console.log('Products Status:', productsRes.status);
  const productsData = await productsRes.json();
  console.log('Products found:', productsData.items?.length);
  const product = productsData.items?.[0];
  if (!product) {
    console.error('No products found in DB!');
    return;
  }
  console.log('Selected Product:', product.title, '| ID:', product.id);
  console.log('Images:', product.images);
  
  // 4. PRODUCT DETAIL
  console.log('\n--- 4. PRODUCT DETAIL ---');
  const productDetailRes = await fetch('http://localhost:3001/api/v1/products/' + product.slug);
  console.log('Product Detail Status:', productDetailRes.status);
  const productDetail = await productDetailRes.json();
  console.log('Product Detail loaded:', productDetail.title);
  
  const variant = productDetail.variants?.[0];
  if (!variant) {
    console.error('No variants found for product!');
    return;
  }
  console.log('Selected Variant:', variant.name, '| ID:', variant.id);
  
  // 5. ADD TO CART
  console.log('\n--- 5. ADD TO CART ---');
  const addCartRes = await fetch('http://localhost:3001/api/v1/cart/items', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + token
    },
    body: JSON.stringify({ productId: product.id, variantId: variant.id, quantity: 1 })
  });
  console.log('Add Cart Status:', addCartRes.status);
  const addCartData = await addCartRes.text();
  console.log('Add Cart Response:', addCartData);
  
  // GET CART
  console.log('\n--- 6. GET CART ---');
  const cartRes = await fetch('http://localhost:3001/api/v1/cart', {
    headers: { 'Authorization': 'Bearer ' + token }
  });
  console.log('Get Cart Status:', cartRes.status);
  const cartData = await cartRes.json();
  console.log('Cart total items:', cartData.items?.length);
  console.log('Cart subtotal:', cartData.subtotal);
}

runFlow().catch(console.error);
