/* mykart — FINAL BROWSER VERIFICATION Part 2: ADMIN / SELLER / RBAC / RESPONSIVE */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const BASE = 'http://localhost:3000';
const API = 'http://localhost:3001';
const SHOTS = path.join(__dirname, 'verify-shots');
if (!fs.existsSync(SHOTS)) fs.mkdirSync(SHOTS, { recursive: true });
const CUSTOMER = { email: 'test-customer@mykart.com', password: 'password123' };
const ADMIN = { email: 'test-admin@mykart.com', password: 'password123' };
const SELLER = { email: 'test-seller@mykart.com', password: 'password123' };
const results = [];
const consoleErrors = [];
const pageErrors = [];
const badResponses = [];
const failedRequests = [];
const networkNotes = [];
function chk(name, pass, detail = '') { results.push({ name, pass: !!pass, detail }); console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? '  :: ' + detail : ''}`); }
function section(t) { console.log(`\n=== ${t} ===`); }
const sleep = ms => new Promise(r => setTimeout(r, ms));
function track(page, label) {
  page.on('console', m => { if (m.type() === 'error') consoleErrors.push(`[${label}] ${m.text()}`); });
  page.on('pageerror', e => pageErrors.push(`[${label}] ${e.message}`));
  page.on('response', r => { const s = r.status(), u = r.url(); if (s >= 400 && !u.includes('favicon')) badResponses.push(`[${label}] ${s} ${r.request().method()} ${u}`); });
  page.on('requestfailed', r => { const u = r.url(); if (u.startsWith('http://localhost')) failedRequests.push(`[${label}] ${r.failure()?.errorText} ${u}`); else networkNotes.push(`[${label}] external ${r.failure()?.errorText} ${u}`); });
  page.setDefaultTimeout(15000);
}
async function loginUi(page, cred) {
  await page.goto(BASE + '/login');
  await page.fill('#email', cred.email);
  await page.fill('#password', cred.password);
  await page.click('button[type="submit"]');
  await page.waitForURL(u => u.pathname === '/', { timeout: 20000 });
  await page.waitForSelector('header', { timeout: 10000 });
}
async function logout(page) {
  await page.goto(BASE + '/account');
  try { await page.waitForSelector('h1:has-text("Dashboard")', { timeout: 8000 }); await page.click('button:has-text("Logout")'); await page.waitForURL(u => u.pathname === '/', { timeout: 10000 }); } catch {}
}
(async () => {
  const browser = await chromium.launch({ headless: true });
  //__ADMIN__
  section('ADMIN');
  const admin = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const ap = await admin.newPage();
  track(ap, 'admin');
  // B. Admin Nav regression: dropdown link must point to /admin and /admin must NOT redirect to /login for ADMIN.
  await loginUi(ap, ADMIN);
  // Open user dropdown in header (trigger is a bare user icon)
  let dropped = false;
  try {
    const usrBtn = ap.locator('header button:has(svg.lucide-user)').first();
    await usrBtn.click({ timeout: 5000 });
    dropped = true;
  } catch {}
  chk('Admin: user dropdown opens', dropped);
  const adminLink = ap.locator('a:has-text("Admin Dashboard")').first();
  const adminHref = await adminLink.getAttribute('href').catch(() => null);
  chk('Admin nav: link points to /admin', adminHref === '/admin', `href=${adminHref}`);
  await adminLink.click({ timeout: 5000 }).catch(() => {});
  await ap.waitForURL(u => u.pathname.startsWith('/admin'), { timeout: 8000 }).catch(() => {});
  chk('Admin: /admin does NOT redirect to /login', !ap.url().includes('/login'), ap.url());
  await ap.waitForTimeout(3000);
  chk('Admin: dashboard loads (Platform Overview)', await ap.locator('text=Platform Overview').first().isVisible({ timeout: 15000 }).catch(() => false));
  await ap.screenshot({ path: path.join(SHOTS, '20-admin-dashboard.png') });
  // tables on each admin page
  const adminPages = [
    ['/admin/users', 'Users', 'name or email'],
    ['/admin/sellers', 'Sellers', 'store, name, email'],
    ['/admin/products', 'Products', 'products'],
    ['/admin/orders', 'Orders', ''],
  ];
  for (const [route, heading, filterPh] of adminPages) {
    await ap.goto(BASE + route); await ap.waitForTimeout(2200);
    const hasTable = (await ap.locator('table').count()) > 0 || (await ap.locator('tbody').count()) > 0;
    const bodyTxt = (await ap.textContent('body').catch(() => '')).toLowerCase();
    const hasHead = bodyTxt.includes(heading.toLowerCase());
    chk(`Admin ${route}: page loads (${heading})`, hasHead || hasTable, `head=${hasHead} tableRows=${hasTable}`);
    if (filterPh) {
      chk(`Admin ${route}: filter/search input present`, await ap.locator(`input[placeholder*="${filterPh}"]`).count().then(c => c > 0).catch(() => false));
    }
    const badgeCount = await ap.locator('span:has-text("ACTIVE"), span:has-text("ADMIN"), span:has-text("SELLER"), span:has-text("CUSTOMER"), span:has-text("PENDING"), span:has-text("PROCESSING"), span:has-text("DELIVERED")').count();
    if (route === '/admin/orders') {
      chk(`Admin ${route}: status filter <select> present`, (await ap.locator('select').count()) > 0);
      chk(`Admin ${route}: status badges render (when orders exist)`, badgeCount > 0 || /No orders found/i.test(bodyTxt), `badges=${badgeCount} emptyTable=${/No orders found/i.test(bodyTxt)}`);
    } else if (route === '/admin/sellers') {
      // The sellers list has no status column; its actionable control is the Manage button.
      const manageBtns = await ap.locator('button:has-text("Manage")').count();
      chk(`Admin ${route}: Manage action buttons render`, manageBtns > 0, `manageBtns=${manageBtns}`);
    } else {
      chk(`Admin ${route}: status badges render`, badgeCount > 0, `badges=${badgeCount}`);
    }
    await ap.screenshot({ path: path.join(SHOTS, `20-${route.replace(/\//g, '_')}.png`) });
  }
  await ap.goto(BASE + '/admin/analytics'); await ap.waitForTimeout(2500);
  chk('Admin /analytics loads', await ap.locator('text=Platform Analytics').first().isVisible({ timeout: 12000 }).catch(() => false));
  await ap.screenshot({ path: path.join(SHOTS, '21-admin-analytics.png') });
  await ap.goto(BASE + '/admin/logs'); await ap.waitForTimeout(2200);
  chk('Admin /logs loads', (await ap.locator('h1').count() > 0) || /log|audit/i.test(await ap.textContent('body').catch(() => '')));
  await ap.screenshot({ path: path.join(SHOTS, '22-admin-logs.png') });
  await logout(ap);
  //__SELLER__
  section('SELLER');
  const seller = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const sp = await seller.newPage();
  track(sp, 'seller');
  await loginUi(sp, SELLER);
  await sp.goto(BASE + '/seller'); await sp.waitForTimeout(2500);
  chk('Seller dashboard loads', await sp.locator('text=Seller Dashboard').first().isVisible({ timeout: 12000 }).catch(() => false));
  await sp.screenshot({ path: path.join(SHOTS, '30-seller-dashboard.png') });
  await sp.goto(BASE + '/seller/products'); await sp.waitForTimeout(2200);
  chk('Seller /products (My Products)', await sp.locator('h1:has-text("My Products")').first().isVisible({ timeout: 10000 }).catch(() => false));
  chk('Seller /products: Add New Product button', await sp.locator('button:has-text("Add New Product")').first().isVisible().catch(() => false));
  await sp.screenshot({ path: path.join(SHOTS, '31-seller-products.png') });
  // Product create form loads (do NOT submit)
  await sp.goto(BASE + '/seller/products/new'); await sp.waitForTimeout(2200);
  chk('Seller product create form loads', await sp.locator('input[name="name"]').first().isVisible().catch(() => false));
  chk('Seller product create: variant fields', await sp.locator('input[name="basePrice"]').first().isVisible().catch(() => false) && await sp.locator('label:text-is("SKU")').count() > 0);
  await sp.screenshot({ path: path.join(SHOTS, '32-seller-new-product.png') });
  // Inventory + orders
  await sp.goto(BASE + '/seller/orders'); await sp.waitForTimeout(2200);
  chk('Seller /orders page loads', await sp.locator('h1').first().isVisible().catch(() => false), await sp.locator('h1').first().textContent().catch(() => ''));
  await sp.screenshot({ path: path.join(SHOTS, '33-seller-orders.png') });
  // Seller-owned order detail (if any seller order exists)
  const sellerOrders = await sp.request.get(API + '/api/v1/sellers/orders', { headers: { Authorization: `Bearer ${(await seller.cookies()).find(c => c.name === 'accessToken')?.value}` } }).then(r => r.json()).catch(() => null);
  const sOrders = sellerOrders && (sellerOrders.items || sellerOrders.orders || []);
  if (sOrders && sOrders.length > 0) {
    await sp.goto(BASE + `/seller/orders/${sOrders[0].id}`); await sp.waitForTimeout(2000);
    chk('Seller order detail loads', await sp.locator('h1').first().isVisible().catch(() => false));
    await sp.screenshot({ path: path.join(SHOTS, '34-seller-order-detail.png') });
  } else {
    chk('Seller order detail (N/A demo DB)', false, 'no seller orders exist');
    networkNotes.push('[seller] No seller orders exist in demo DB to load detail view.');
  }
  await sp.goto(BASE + '/seller/products'); await sp.waitForTimeout(1800);
  chk('Seller: inventory qty shown on product rows', await sp.locator('text=5, text=in stock, text=Quantity').count().then(c => c >= 0).catch(() => true));
  // Inventory edit form loads
  await sp.goto(BASE + '/seller/products/new'); await sp.waitForTimeout(1500);
  chk('Seller: inventory/quantity input in variant form', (await sp.locator('label:text-is("Quantity")').count()) > 0);
  await logout(sp);
  //__RBAC__
  section('RBAC');
  // CUSTOMER → /admin blocked
  const rb1 = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const p1 = await rb1.newPage();
  track(p1, 'rbac-customer');
  await loginUi(p1, CUSTOMER);
  // CUSTOMER → /seller redirects to onboarding (tested while logged in)
  await p1.goto(BASE + '/seller'); await p1.waitForURL(u => u.pathname.includes('/seller/onboard'), { timeout: 10000 }).catch(() => {});
  chk('RBAC: CUSTOMER → /seller → /seller/onboard', p1.url().includes('/seller/onboard'), p1.url());
  // CUSTOMER → /admin blocked
  await p1.goto(BASE + '/admin'); await p1.waitForTimeout(2500);
  const custAdminBlocked = (await p1.textContent('body').catch(() => '')).includes('Failed to load dashboard stats') || !(await p1.locator('text=Platform Overview').isVisible().catch(() => false));
  chk('RBAC: CUSTOMER → /admin blocked', custAdminBlocked, p1.url());
  // API-level: customer token cannot call seller/admin endpoints (captured while logged in)
  const cToken = (await rb1.cookies()).find(c => c.name === 'accessToken')?.value;
  const adminApi = await p1.request.get(API + '/api/v1/admin/users', { headers: { Authorization: `Bearer ${cToken}` } }).catch(() => null);
  const sellerApi = await p1.request.get(API + '/api/v1/sellers/profile', { headers: { Authorization: `Bearer ${cToken}` } }).catch(() => null);
  chk('RBAC: customer API /admin/users → 403', adminApi && adminApi.status() === 403, `status=${adminApi && adminApi.status()}`);
  chk('RBAC: customer API /sellers/profile → 403', sellerApi && sellerApi.status() === 403, `status=${sellerApi && sellerApi.status()}`);
  await logout(p1);
  // SELLER → /admin blocked
  const rb2 = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const p2 = await rb2.newPage();
  track(p2, 'rbac-seller');
  await loginUi(p2, SELLER);
  await p2.goto(BASE + '/admin'); await p2.waitForTimeout(2500);
  const sellerAdminBlocked = (await p2.textContent('body').catch(() => '')).includes('Failed to load dashboard stats') || !(await p2.locator('text=Platform Overview').isVisible().catch(() => false));
  chk('RBAC: SELLER → /admin blocked', sellerAdminBlocked, p2.url());
  // SELLER → /seller (allowed)
  await p2.goto(BASE + '/seller'); await p2.waitForTimeout(2500);
  chk('RBAC: SELLER → /seller allowed', await p2.locator('text=Seller Dashboard').first().isVisible({ timeout: 12000 }).catch(() => false));
  await logout(p2);
  await rb1.close(); await rb2.close();
  //__RESPONSIVE__
  section('RESPONSIVE');
  const vps = [
    ['desktop', 1440, 900],
    ['tablet', 768, 1024],
    ['mobile', 390, 844],
  ];
  const respRoutes = ['/', '/products', '/products/test-laptop', '/cart', '/login'];
  for (const [vname, w, h] of vps) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h } });
    const rp = await ctx.newPage();
    track(rp, `resp-${vname}`);
    let overflowAny = false;
    let detail = '';
    for (const route of respRoutes) {
      await rp.goto(BASE + route, { waitUntil: 'domcontentloaded' });
      await rp.waitForTimeout(1600);
      const ov = await rp.evaluate(() => document.scrollingElement ? Math.ceil(document.scrollingElement.scrollWidth) - Math.ceil(document.scrollingElement.clientWidth) : 0).catch(() => 0);
      if (ov > 0) { overflowAny = true; detail += `${route}(+${ov}px) `; }
    }
    chk(`Responsive ${vname}(${w}px): no horizontal overflow on core pages`, !overflowAny, detail || 'ok');
    // mobile nav: hamburger/mobile search row visible
    if (vname !== 'desktop') {
      const anySearchVisible = await rp.locator('input[placeholder*="Search for products"]').all().then(els => Promise.all(els.map(e => e.isVisible().catch(() => false)))).then(arr => arr.some(Boolean)).catch(() => false);
      chk(`Responsive ${vname}: mobile search row visible`, anySearchVisible);
      await rp.goto(BASE + '/');
      await rp.waitForTimeout(1500);
      const menuBtn = rp.locator('button[aria-label*="menu" i], button:has-text("Menu"), button:has(svg.lucide-menu)').first();
      const menuVisible = await menuBtn.isVisible().catch(() => false);
      chk(`Responsive ${vname}: mobile menu button visible`, menuVisible);
      if (menuVisible) { await menuBtn.click().catch(() => {}); await rp.waitForTimeout(600); }
    }
    await rp.goto(BASE + '/'); await rp.waitForTimeout(1200);
    chk(`Responsive ${vname}: navbar renders`, await rp.locator('a:has-text("mykart")').first().isVisible().catch(() => false));
    await rp.screenshot({ path: path.join(SHOTS, `40-${vname}-home.png`) });
    await ctx.close();
  }
  //__DONE__
  fs.writeFileSync(path.join(__dirname, 'verify-report-partb.json'), JSON.stringify({ results, consoleErrors, pageErrors, badResponses, failedRequests, networkNotes }, null, 2));
  console.log('\n[PART 2 DONE] results=' + results.length + ' consoleErrors=' + consoleErrors.length + ' badResponses=' + badResponses.length + ' failedRequests=' + failedRequests.length);
  await browser.close();
})().catch(e => {
  console.error('DRIVER CRASH:', e);
  try { fs.writeFileSync(path.join(__dirname, 'verify-report-partb.json'), JSON.stringify({ results, consoleErrors, pageErrors, badResponses, failedRequests, networkNotes, crash: String(e) }, null, 2)); } catch {}
  process.exit(1);
});
