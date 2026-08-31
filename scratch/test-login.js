const { chromium } = require('playwright');

async function testLogin() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on('response', async (res) => {
    if (res.url().includes('/auth/login')) {
      console.log('LOGIN RESPONSE STATUS:', res.status());
      console.log('LOGIN RESPONSE BODY:', await res.text());
    }
  });

  await page.goto('https://mykart-ecommerce-web.vercel.app/login', { waitUntil: 'networkidle' });
  await page.fill('input[type="email"]', 'admin@mykart.test');
  await page.fill('input[type="password"]', 'MyKart@123');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(4000);

  console.log('FINAL URL:', page.url());
  await browser.close();
}

testLogin();
