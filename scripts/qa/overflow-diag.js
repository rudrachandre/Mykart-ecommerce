/* /search verification: single Filters node (Suspense fix) + overflow at 1440/768/390 */
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  for (const vp of [{ name: 'desktop', w: 1440 }, { name: 'tablet', w: 768 }, { name: 'mobile', w: 390 }]) {
    const page = await browser.newPage({ viewport: { width: vp.w, height: 900 } });
    await page.goto('http://localhost:3000/search', { waitUntil: 'networkidle', timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(1500);
    const r = await page.evaluate(() => {
      const vw = window.innerWidth;
      const sw = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth);
      const filters = Array.from(document.querySelectorAll('h3')).filter(h => h.textContent.trim() === 'Filters');
      return {
        overflow: sw - vw,
        filtersCount: filters.length,
        visibleFilters: filters.filter(h => h.offsetParent !== null).length,
        hasApplyBtn: !!Array.from(document.querySelectorAll('button')).find(b => /apply/i.test(b.textContent)),
        h1: document.querySelector('h1')?.textContent?.trim(),
      };
    });
    console.log(`[${vp.name}] `, JSON.stringify(r));
    await page.close();
  }
  await browser.close();
  console.log('SEARCH-CHECK DONE');
})().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
const { chromium } = require('playwright');
const fs = require('fs');

const VP = [ { name: 'desktop', w: 1440, h: 900 }, { name: 'tablet', w: 768, h: 1024 }, { name: 'mobile', w: 390, h: 844 } ];
const ROUTES = ['/', '/products', '/login', '/register', '/cart', '/wishlist'];

async function measure(page) {
  await page.evaluate(async () => {
    await new Promise((res) => {
      let y = 0;
      const step = () => { y += 600; window.scrollTo(0, y); if (y < (document.body.scrollHeight||0)) setTimeout(step, 60); else { window.scrollTo(0, 0); setTimeout(res, 300); } };
      step();
    });
  });
  await page.waitForTimeout(500);
  return page.evaluate(() => {
    const vw = window.innerWidth, sw = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth);
    let offenders = [];
    if (sw > vw + 1) for (const el of document.querySelectorAll('*')) { const r = el.getBoundingClientRect(); if (r.width > 0 && r.right > vw + 1) { offenders.push({ tag: el.tagName, cls: String(el.className).slice(0, 60), right: Math.round(r.right) }); if (offenders.length >= 5) break; } }
    return { vw, sw, overflow: sw - vw, offenders };
  });
}

async function login(page, role) {
  const email = role === 'admin' ? 'test-admin@mykart.com' : role === 'seller' ? 'test-seller@mykart.com' : 'test-customer@mykart.com';
  await page.goto('http://localhost:3000/login');
  await page.fill('#email', email);
  await page.fill('#password', 'password123');
  await page.click('button[type="submit"]');
  try { await page.waitForURL('http://localhost:3000/', { timeout: 12000 }); } catch { await page.click('button[type="submit"]'); await page.waitForURL('http://localhost:3000/'); }
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const report = { responsive: {}, wishlist: {} };

  // --- responsive sweep (guest) ---
  for (const vp of VP) {
    const c = await browser.newContext({ viewport: { width: vp.w, height: vp.h } });
    const p = await c.newPage();
    report.responsive[vp.name] = {};
    for (const route of ROUTES) {
      try { await p.goto('http://localhost:3000' + route, { waitUntil: 'networkidle', timeout: 30000 }); } catch { await p.goto('http://localhost:3000' + route, { waitUntil: 'domcontentloaded' }); }
      const m = await measure(p);
      report.responsive[vp.name][route] = m.overflow;
      console.log(`[${vp.name} ${route}] overflow=${m.overflow}px`);
    }
    await c.close();
  }

  // --- wishlist full-flow browser test with network inspection ---
  const c = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const p = await c.newPage();
  const wlNet = [];
  p.on('response', r => {
    const u = r.url();
    if (u.includes('/api/v1/wishlist')) {
      wlNet.push({ method: r.request().method(), url: u.replace(/.*\.(com|org|net)/,''), status: r.status() });
    }
  });
  const wlConsole = [];
  p.on('console', m => { if (m.type() === 'error') wlConsole.push(m.text().slice(0, 150)); });

  await login(p, 'customer');
  console.log('[wishlist] logged in as customer');

  await p.goto('http://localhost:3000/products/test-laptop', { waitUntil: 'networkidle', timeout: 30000 });
  await p.waitForTimeout(800);

  // add to wishlist
  const wishBtn = p.locator('button:has-text("Wishlist"), button[aria-label*="wishlist"]').first();
  await wishBtn.click();
  await p.waitForTimeout(4000); // wait for toast + backend
  const toastAdded = await p.locator('text=Added to wishlist').count() > 0;
  console.log('[wishlist] add toast:', toastAdded);

  // navigate to wishlist page
  await p.goto('http://localhost:3000/wishlist', { waitUntil: 'networkidle', timeout: 30000 });
  await p.waitForTimeout(2500);
  const pdpInWl = await p.locator('text=Test Laptop').count();
  console.log('[wishlist] item persists on /wishlist page:', pdpInWl > 0, `(count=${pdpInWl})`);

    // remove via delete button on wishlist page
  let removed = false;
  try {
    // find the remove button by text near the Wishlist item card
    const removeByText = p.locator('text=Remove, text=🗑, text=×').first();
    if (await removeByText.count()) await removeByText.click();
    else {
      const delBtns = p.locator('button').filter({ hasText: /remove|delete|trash/i });
      if (await delBtns.count()) await delBtns.first().click();
    }
    await p.waitForTimeout(3000);
    const gone = await p.locator('text=Test Laptop').count() === 0;
    removed = gone;
  } catch (e) { console.log('[wishlist] remove error:', e.message.slice(0,120)); }
  console.log('[wishlist] removed:', removed);

  // fetch API directly to confirm final DB state
  const tokenResp = await p.context().storageState();
  const cookies = tokenResp.cookies.find(x => x.name === 'accessToken');
  let apiCheck = 'no-cookie';
  if (cookies) {
    const r = await fetch('http://localhost:3001/api/v1/wishlist', { headers: { Authorization: `Bearer ${cookies.value}` } });
    const j = await r.json().catch(() => ({}));
    apiCheck = `${r.status} items=${j.items?.length ?? 'NA'}`;
  }

  report.wishlist = { added: toastAdded, persistsOnPage: pdpInWl > 0, removed, network: wlNet, apiFinal: apiCheck, consoleErrors: wlConsole };
  console.log('[wishlist] network log:', JSON.stringify(wlNet));
  console.log('[wishlist] api final:', apiCheck);
  console.log('[wishlist] consoleErrors:', JSON.stringify(wlConsole));

  fs.writeFileSync('final-report.json', JSON.stringify(report, null, 2));
  await browser.close();
  console.log('DONE');
})().catch(e => { console.error('FATAL:', e.message); process.exit(1); });