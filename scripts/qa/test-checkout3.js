const http = require('http');

async function runFlow() {
  const loginRes = await fetch('http://localhost:3001/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@example.com', password: 'password123' })
  });
  const token = (await loginRes.json()).accessToken;

  const orderData = {
    shippingAddress: {
      fullName: 'Admin User',
      addressLine1: '123 Test St',
      addressLine2: '',
      city: 'Test City',
      state: 'TS',
      postalCode: '12345',
      country: 'Testland',
      phone: '1234567890'
    },
    paymentMethod: 'RAZORPAY'
  };

  const orderRes = await fetch('http://localhost:3001/api/v1/orders/checkout', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + token
    },
    body: JSON.stringify(orderData)
  });
  
  console.log('Order Status:', orderRes.status);
  const orderResData = await orderRes.json();
  console.log('Order Response:', orderResData);
  
  // Verify order history
  const historyRes = await fetch('http://localhost:3001/api/v1/orders', {
    headers: { 'Authorization': 'Bearer ' + token }
  });
  console.log('History Status:', historyRes.status);
  const historyData = await historyRes.json();
  console.log('Order history length:', historyData.length);
  if (historyData.length > 0) {
    console.log('Order ID from history:', historyData[0].id);
  }
}

runFlow().catch(console.error);
