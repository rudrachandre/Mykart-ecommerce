const http = require('http');

async function runFlow() {
  const loginRes = await fetch('http://localhost:3001/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@example.com', password: 'password123' })
  });
  const token = (await loginRes.json()).accessToken;

  console.log('\n--- 7. CHECKOUT / CREATE ORDER ---');
  // First get cart to find cart items
  const cartRes = await fetch('http://localhost:3001/api/v1/cart', {
    headers: { 'Authorization': 'Bearer ' + token }
  });
  const cartData = await cartRes.json();
  console.log('Cart:', JSON.stringify(cartData, null, 2));
  
  if (!cartData.items || cartData.items.length === 0) {
    console.error('Cart is empty, cannot checkout.');
    return;
  }
  
  // Create order endpoint
  const orderData = {
    shippingAddress: {
      fullName: 'Admin User',
      street: '123 Test St',
      city: 'Test City',
      state: 'TS',
      postalCode: '12345',
      country: 'Testland',
      phone: '1234567890'
    },
    paymentMethod: 'RAZORPAY'
  };

  const orderRes = await fetch('http://localhost:3001/api/v1/orders', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + token
    },
    body: JSON.stringify(orderData)
  });
  
  console.log('Order Status:', orderRes.status);
  const orderResData = await orderRes.text();
  console.log('Order Response:', orderResData);
}

runFlow().catch(console.error);
