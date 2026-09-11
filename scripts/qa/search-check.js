/* Reproduce cart-drawer failure with full instrumentation */
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();

  // 1) mint token
  const res = await fetch('http://localhost:3001/api/v1/auth/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'test-customer@mykart.com', password: 'password123' }),
  });
  console.log('login status:', res.status);
  const data = await res.json();
  await ctx.addCookies([{ name: 'accessToken', value: data.accessToken, domain: 'localhost', path: '/' }]);

  const net = [];
  page.on('response', r => { if (r.url().includes('/api/v1/cart')) net.push(`${r.request().method()} ${r.status()} ${r.url().slice(28)}`); });
  page.on('response', r => { if (r.request().method() === 'POST' && r.url().includes('/api/v1/cart')) r.text().then(b => console.log('POST resp:', b.slice(0, 300))).catch(() => {}); });
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 200)); });
  page.on('pageerror', e => errs.push('PAGEERROR: ' + e.message.slice(0, 200)));

  await page.goto('http://localhost:3000/products/test-laptop', { waitUntil: 'networkidle', timeout: 60000 });
  // give hydration time explicitly
  await page.waitForTimeout(2500);

  await page.click('button:has-text("Add to Cart")');
  try {
    await page.waitForSelector('h2:has-text("Your Cart")', { timeout: 15000 });
    console.log('DRAWER: opened');
  } catch {
    console.log('DRAWER: did NOT open');
  }
  await page.waitForTimeout(1000);
  const drawerInDom = await page.locator('h2:has-text("Your Cart")').count();
  const toasts = await page.locator('[data-sonner-toast]').allTextContents();
  console.log('drawer nodes:', drawerInDom);
  console.log('toasts:', JSON.stringify(toasts));
  console.log('cart network:', JSON.stringify(net, null, 1));
  console.log('consoleErrors:', JSON.stringify(errs));

  await browser.close();
})().catch(e => { console.error('FATAL:', e.message); process.exit(1); });