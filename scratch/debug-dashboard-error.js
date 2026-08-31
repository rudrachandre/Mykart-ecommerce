const https = require('https');

function postJson(url, data) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(data);
    const req = https.request(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data: JSON.parse(data) }));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function getJson(url, token) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data }));
    });
    req.on('error', reject);
    req.end();
  });
}

async function run() {
  try {
    const login = await postJson('https://mykart-ecommerce.onrender.com/api/v1/auth/login', {
      email: 'admin@mykart.test',
      password: 'MyKart@123',
    });
    const token = login.data.accessToken;

    if (token) {
      const overview = await getJson('https://mykart-ecommerce.onrender.com/api/v1/analytics/overview', token);
      console.log('/analytics/overview Status:', overview.status);
      console.log('/analytics/overview Data preview:', overview.data.substring(0, 150));
    }
  } catch (err) {
    console.error('Error:', err);
  }
}

run();
