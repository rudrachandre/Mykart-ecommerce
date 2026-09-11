async function runTests() {
  const API = 'http://localhost:3001/api/v1';
  let accessToken, refreshToken;
  let testEmail = `test${Date.now()}@example.com`;

  console.log('--- 1. Registration ---');
  const res1 = await fetch(`${API}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Test User', email: testEmail, password: 'password123' })
  });
  const data1 = await res1.json();
  const cookies1 = res1.headers.get('set-cookie');
  console.log('Register status:', res1.status);
  console.log('Access token received:', !!data1.accessToken);
  console.log('Refresh cookie received:', !!cookies1);

  console.log('\n--- 2. Login ---');
  const res2 = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail, password: 'password123' })
  });
  const data2 = await res2.json();
  const cookies2 = res2.headers.get('set-cookie');
  console.log('Login status:', res2.status);
  
  accessToken = data2.accessToken;
  refreshToken = cookies2.split(';')[0]; // simple extraction
  console.log('Refresh cookie:', refreshToken);

  console.log('\n--- 3. Protected /users/me ---');
  const res3 = await fetch(`${API}/users/me`, {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });
  const data3 = await res3.json();
  console.log('/users/me status:', res3.status);
  console.log('User email:', data3.email);

  console.log('\n--- 10. CUSTOMER vs ADMIN authorization ---');
  const res4 = await fetch(`${API}/users/admin-only`, {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });
  console.log('/users/admin-only status (Expect 403):', res4.status);

  console.log('\n--- 4. Token refresh & 5. Rotation ---');
  const res5 = await fetch(`${API}/auth/refresh`, {
    method: 'POST',
    headers: { 'Cookie': refreshToken }
  });
  const data5 = await res5.json();
  const cookies5 = res5.headers.get('set-cookie');
  console.log('Refresh status:', res5.status);
  console.log('New Access Token received:', !!data5.accessToken);
  
  const newRefreshToken = cookies5.split(';')[0];
  console.log('Tokens rotated:', refreshToken !== newRefreshToken);

  console.log('\n--- 6. Old-token reuse detection & 7. Family revocation ---');
  const res6 = await fetch(`${API}/auth/refresh`, {
    method: 'POST',
    headers: { 'Cookie': refreshToken } // Reuse old
  });
  console.log('Reuse old token status (Expect 401):', res6.status);

  const res7 = await fetch(`${API}/auth/refresh`, {
    method: 'POST',
    headers: { 'Cookie': newRefreshToken } // Attempt to use new one, should fail due to family revocation
  });
  console.log('Use new token after reuse status (Expect 401):', res7.status);

  console.log('\n--- 8. Logout ---');
  // Need to login again to get a valid token for logout test
  const res8a = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail, password: 'password123' })
  });
  const cookies8a = res8a.headers.get('set-cookie').split(';')[0];

  const res8 = await fetch(`${API}/auth/logout`, {
    method: 'POST',
    headers: { 'Cookie': cookies8a }
  });
  console.log('Logout status:', res8.status);

  const res9 = await fetch(`${API}/auth/refresh`, {
    method: 'POST',
    headers: { 'Cookie': cookies8a }
  });
  console.log('Refresh after logout status (Expect 401):', res9.status);
}

runTests().catch(console.error);
