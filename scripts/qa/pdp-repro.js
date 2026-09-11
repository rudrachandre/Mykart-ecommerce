/* PDP hydration repro: full console capture at 1440/768/390 + immediate-click probe */
const { chromium } = require('playwright');

const BASE = process.env.PDP_BASE || 'http://localhost:3002';

(async () => {
  const browser = await chromium.launch({ headless: true });
  for (const vp of [{ name: 'desktop', w: 1440 }, { name: 'tablet', w: 768 }, { name: 'mobile', w: 390 }]) {
    const ctx = await browser.newContext({ viewport: { width: vp.w, height: 900 } });
    const page = await ctx.newPage();

    // Seed an authenticated session BEFORE load — the reported #418 occurs
    // for logged-in users (cookie present on client, absent during SSR).
    const login = await fetch('http://localhost:3001/api/v1/auth/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test-customer@mykart.com', password: 'password123' }),
    });
    if (!login.ok) { console.log('login failed', login.status); continue; }
    const tok = (await login.json()).accessToken;
    await ctx.addCookies([{ name: 'accessToken', value: tok, domain: 'localhost', path: '/' }]);

    const logs = [];
    page.on('console', m => {
      const t = m.text();
      if (/hydrat|#418|#425|#423|did not match|Extra attributes|Text content|mismatch/i.test(t)) {
        logs.push(`[console.${m.type()}] ${t}`);
      }
    });
    page.on('pageerror', e => logs.push(`[pageerror] ${e.message}`));

    const net = [];
    page.on('response', async r => {
      const u = r.url();
      if (u.includes('/api/v1/cart')) {
        let body = '';
        try { body = (await r.text()).slice(0, 120); } catch {}
        net.push(`${r.request().method()} ${r.status()} ${u.replace(BASE, '')} ${body}`);
      }
    });
    page.on('requestfailed', r => { if (r.url().includes('/cart')) net.push(`FAILED ${r.request().method()} ${r.url().replace(BASE,'')}`); });

    await page.goto(BASE + '/products/test-laptop', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(3000); // let hydration settle/fail

    // immediate-click probe WITHOUT extra settle: click Add to Cart right away on fresh load
    const clicked = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const b = btns.find(x => x.textContent.trim() === 'Add to Cart');
      if (!b) return 'no-button';
      b.click();
      return 'clicked';
    });
    await page.waitForTimeout(8000);
    const drawer = await page.locator('h2:has-text("Your Cart")').count();
    const toasts = await page.locator('[data-sonner-toast]').allTextContents();
    const reviewForm = await page.locator('button:has-text("Submit Review")').count();
    const imgsOk = await page.evaluate(() => {
      const imgs = Array.from(document.querySelectorAll('main img, img'));
      return imgs.length > 0 && imgs.every(i => i.complete ? i.naturalWidth > 0 || i.src.includes('placeholder') : true);
    });
    const priceOk = await page.evaluate(() => /50[, ]?000|₹\s*50/.test(document.body.innerText));

    console.log(`\n===== [${vp.name} ${vp.w}px] =====`);
    console.log('immediateClick:', clicked, '| drawerOpen:', drawer > 0, '| toasts:', JSON.stringify(toasts), '| reviewFormVisible:', reviewForm > 0, '| imagesLoaded:', imgsOk, '| priceRendered:', priceOk);
    net.forEach(n => console.log('  NET:', n));
    if (logs.length === 0) console.log('HYDRATION: clean');
    else logs.forEach(l => console.log(l.slice(0, 2000)));
    await ctx.close();
  }
  await browser.close();
  console.log('\nREPRO DONE');
})().catch(e => { console.error('FATAL:', e.message); process.exit(1); });