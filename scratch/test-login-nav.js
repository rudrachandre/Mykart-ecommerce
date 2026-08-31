const { chromium } = require('playwright');

async function testLoginNav() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log('1. Navigating to /login...');
  await page.goto('https://mykart-ecommerce-web.vercel.app/login', { waitUntil: 'networkidle' });

  console.log('2. Filling credentials...');
  await page.fill('input[type="email"]', 'admin@mykart.test');
  await page.fill('input[type="password"]', 'MyKart@123');

  console.log('3. Submitting form and waiting for navigation...');
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle', timeout: 15000 }).catch(e => console.log('Navigation wait timeout/info:', e.message)),
    page.click('button[type="submit"]'),
  ]);

  console.log('4. Final page URL:', page.url());
  const cookies = await context.cookies();
  console.log('5. Access Token Cookie:', cookies.find(c => c.name === 'accessToken')?.value?.substring(0, 20) + '...');

  if (page.url().includes('/admin')) {
    console.log('6. Checking Admin Dashboard heading...');
    const heading = await page.locator('h1').allTextContents();
    console.log('Headings:', heading);
  }

  await browser.close();
}

testLoginNav();
