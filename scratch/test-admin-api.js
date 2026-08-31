const { chromium } = require('playwright');

async function testAdminApi() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on('response', async (res) => {
    if (res.url().includes('/analytics/')) {
      console.log(`API RESPONSE [${res.status()}] ${res.url()}`);
      if (res.status() !== 200) {
        console.log('RESPONSE BODY:', await res.text());
      }
    }
  });

  console.log('Logging in as admin...');
  await page.goto('https://mykart-ecommerce-web.vercel.app/login?callbackUrl=/admin', { waitUntil: 'networkidle' });
  await page.fill('input[type="email"]', 'admin@mykart.test');
  await page.fill('input[type="password"]', 'MyKart@123');
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle', timeout: 15000 }),
    page.click('button[type="submit"]'),
  ]);

  await page.waitForTimeout(3000);
  console.log('Current URL:', page.url());
  const h1Text = await page.locator('h1').allTextContents();
  console.log('Page Headings:', h1Text);

  await browser.close();
}

testAdminApi();
