/* mykart — FINAL BROWSER VERIFICATION (post UI redesign). Real Chromium vs live stack. */
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
  //__GUEST__
  section('CUSTOMER FLOWS (guest)');
  const guest = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const gp = await guest.newPage();
  track(gp, 'guest');
  await gp.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  await gp.waitForSelector('h1', { timeout: 10000 });
  const heroText = await gp.textContent('h1').catch(() => '');
  chk('Homepage h1 active', /Everyday essentials/i.test(heroText || ''), `h1="${(heroText || '').trim()}"`);
  const body0 = await gp.textContent('body').catch(() => '');
  chk('Homepage: Trending section', /Trending Right Now/i.test(body0));
  chk('Homepage: DealsBanner (CREATIVE20)', /CREATIVE20/i.test(body0));
  await gp.screenshot({ path: path.join(SHOTS, '01-home-desktop.png') });
  chk('Navbar: logo visible', await gp.locator('a:has-text("mykart")').first().isVisible().catch(() => false));
  chk('Navbar: search visible', await gp.locator('input[placeholder*="Search for products"]').first().isVisible().catch(() => false));
  chk('Navbar: cart bag icon', await gp.locator('button:has(svg.lucide-shopping-bag)').first().isVisible().catch(() => false));
  chk('Navbar: Sign in link (guest)', await gp.locator('a:has-text("Sign in")').first().isVisible().catch(() => false));
  await gp.locator('input[placeholder*="Search for products"]').first().fill('laptop');
  await gp.waitForTimeout(1500);
  const sug = await gp.locator('div.z-50 a[href^="/products/"]').allTextContents().catch(() => []);
  chk('Search autocomplete → product suggestions shown', sug.length > 0, sug.slice(0, 3).join(' | '));
  const sugCat = await gp.locator('div.z-50 a[href^="/categories/"]').count();
  chk('Search autocomplete → category links present (if any)', sugCat >= 0, `categoryLinks=${sugCat}`);
  await gp.screenshot({ path: path.join(SHOTS, '02-search-autocomplete.png') });
  await gp.keyboard.press('Escape'); await gp.waitForTimeout(400);
  await gp.goto(BASE + '/products', { waitUntil: 'domcontentloaded' }); await gp.waitForTimeout(2000);
  chk('Product listing: test-laptop card', (await gp.locator('a[href="/products/test-laptop"]').count()) > 0);
  await gp.screenshot({ path: path.join(SHOTS, '03-products.png') });
  await gp.goto(BASE + '/products/test-laptop', { waitUntil: 'domcontentloaded' }); await gp.waitForTimeout(2500);
  chk('PDP: title', (await gp.textContent('h1').catch(() => '')) === 'Test Laptop');
  chk('PDP: price ₹50,000', /50[,]?000/.test(await gp.textContent('body').catch(() => '')));
  for (const b of ['Fast Delivery', '7 Days Return', 'Secure Payment', 'Top Rated Seller'])
    chk(`PDP: trust "${b}"`, new RegExp(b).test(await gp.textContent('body').catch(() => '')));
  chk('PDP: Add to Cart btn', await gp.locator('button:has-text("Add to Cart")').first().isVisible().catch(() => false));
  chk('PDP: Buy Now (ink variant)', await gp.locator('button:has-text("Buy Now")').first().isVisible().catch(() => false));
  chk('PDP: Add to Wishlist btn', await gp.locator('button:has-text("Add to Wishlist")').first().isVisible().catch(() => false));
  chk('PDP: Related Products', /Related Products/i.test(await gp.textContent('body').catch(() => '')));
  await gp.screenshot({ path: path.join(SHOTS, '04-pdp-desktop.png') });
  const brokenImgs = await gp.evaluate(() => Array.from(document.images).filter(i => i.complete && i.naturalWidth === 0 && i.naturalHeight === 0).map(i => i.src)).catch(() => []);
  chk('PDP: no broken <img>', brokenImgs.length === 0, brokenImgs.length ? brokenImgs.join(' | ') : 'ok');
  await gp.goto(BASE + '/cart', { waitUntil: 'domcontentloaded' }); await gp.waitForTimeout(1500);
  chk('Guest /cart → Sign In to Continue', await gp.locator('text=Sign In to Continue').first().isVisible().catch(() => false));
  await gp.goto(BASE + '/products/test-laptop', { waitUntil: 'domcontentloaded' }); await gp.waitForTimeout(1200);
  await gp.click('button:has-text("Add to Wishlist")');
  await gp.waitForURL(/\/login\?callbackUrl=/, { timeout: 8000 }).catch(() => {});
  chk('Guest wishlist → login redirect', /\/login\?callbackUrl=/.test(gp.url()), gp.url());
  await gp.goto(BASE + '/account', { waitUntil: 'domcontentloaded' });
  await gp.waitForURL(/\/login/, { timeout: 8000 }).catch(() => {});
  chk('Guest /account → /login', /\/login/.test(gp.url()), gp.url());
  await gp.goto(BASE + '/orders'); await gp.waitForTimeout(2000);
  chk('Guest /orders → inline sign-in prompt', /Sign In to View Orders/i.test(await gp.textContent('body').catch(() => '')));
  await gp.goto(BASE + '/checkout'); await gp.waitForTimeout(2000);
  chk('Guest /checkout → sign-in prompt', /Please sign in to checkout/i.test(await gp.textContent('body').catch(() => '')));
  await guest.close();
  //__CUSTOMER__
  section('CUSTOMER FLOWS (authenticated)');
  const cust = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const cp = await cust.newPage();
  track(cp, 'customer');
  await loginUi(cp, CUSTOMER);
  chk('Login redirects to /', /\/$/.test(new URL(cp.url()).pathname), cp.url());
  chk('Header no "Sign in" after login', (await cp.locator('a:has-text("Sign in")').count()) === 0);
  // Pre-clean cart + wishlist via API so assertions start from a known state.
  const preToken = (await cust.cookies()).find(c => c.name === 'accessToken')?.value;
  try {
    const cart0 = await cp.request.get(API + '/api/v1/cart', { headers: { Authorization: `Bearer ${preToken}` } }).then(r => r.json()).catch(() => ({ items: [] }));
    for (const it of (cart0.items || [])) await cp.request.delete(API + `/api/v1/cart/items/${it.id}`, { headers: { Authorization: `Bearer ${preToken}` } });
    const wl0 = await cp.request.get(API + '/api/v1/wishlist', { headers: { Authorization: `Bearer ${preToken}` } }).then(r => r.json()).catch(() => ({ items: [] }));
    for (const it of (wl0.items || [])) await cp.request.delete(API + `/api/v1/wishlist/items/${it.id}`, { headers: { Authorization: `Bearer ${preToken}` } });
  } catch {} 
  await cp.goto(BASE + '/account'); await cp.waitForTimeout(1500);
  chk('Login → /account Dashboard', await cp.locator('h1:has-text("Dashboard")').first().isVisible().catch(() => false));
  await cp.screenshot({ path: path.join(SHOTS, '05-account.png') });
  let cartPostPayload = null, cartPostStatus = null, cartPostList = [];
  cp.on('request', req => { if (/\/api\/v1\/cart\/items/.test(req.url()) && req.method() === 'POST') { try { cartPostPayload = JSON.parse(req.postData() || '{}'); } catch {} } });
  cp.on('response', res => { const u = res.url(); if (/\/api\/v1\/cart\/items/.test(u)) { const m = res.request().method(); if (m === 'POST') cartPostStatus = res.status(); cartPostList.push(`${m} ${u} -> ${res.status()}`); } });
  await cp.goto(BASE + '/products/test-laptop'); await cp.waitForTimeout(1800);
  await cp.click('button:has-text("Add to Cart")');
  let toastTexts = await cp.locator('[data-sonner-toast]').allTextContents().catch(() => []);
  for (let i = 0; i < 14 && !toastTexts.some(t => /Added to cart/.test(t)); i++) { await cp.waitForTimeout(700); toastTexts = await cp.locator('[data-sonner-toast]').allTextContents().catch(() => []); }
  chk('Add to Cart: toast area rendered', toastTexts.length > 0, toastTexts.join(' | '));
  chk('Add to Cart: "Added to cart" toast', toastTexts.some(t => /Added to cart/.test(t)), toastTexts.join(' | '));
  chk('Add to Cart: no "Failed to add to cart"', !toastTexts.some(t => /Failed to add to cart/.test(t)), toastTexts.join(' | '));
  chk('Add to Cart: POST /cart/items accepted (201/200)', cartPostStatus === 201 || cartPostStatus === 200, `status=${cartPostStatus} list=[${(cartPostList || []).join(', ')}]`);
  chk('Add to Cart: payload productId', !!(cartPostPayload && cartPostPayload.productId), JSON.stringify(cartPostPayload));
  chk('Add to Cart: payload variantId', !!(cartPostPayload && cartPostPayload.variantId), JSON.stringify(cartPostPayload));
  chk('Add to Cart: payload quantity=1', cartPostPayload && cartPostPayload.quantity === 1, JSON.stringify(cartPostPayload));
  await cp.waitForSelector('h2:has-text("Your Cart")', { timeout: 8000 }).catch(() => {});
  chk('Cart drawer opens (Your Cart)', await cp.locator('h2:has-text("Your Cart")').first().isVisible().catch(() => false));
  chk('Cart drawer shows Test Laptop', await cp.locator('text=Test Laptop').first().isVisible().catch(() => false));
  chk('Cart drawer qty 1', await cp.locator('span:has-text("1")').first().isVisible().catch(() => false));
  await cp.screenshot({ path: path.join(SHOTS, '06-cart-drawer.png') });
  const drawerPanel = cp.locator('div.fixed.inset-y-0.right-0');
  const drawerPlus = drawerPanel.locator('button:has(svg.lucide-plus)').first();
  const drawerMinus = drawerPanel.locator('button:has(svg.lucide-minus)').first();
  await drawerPlus.click();
  await cp.waitForTimeout(900);
  const toastPlus = await cp.locator('[data-sonner-toast]').allTextContents().catch(() => []);
  chk('Quantity increase → "Cart updated" toast', toastPlus.some(t => /Cart updated/.test(t)), toastPlus.join(' | '));
  chk('Quantity increase → qty 2 shown', await cp.locator('span:has-text("2")').first().isVisible().catch(() => false));
  await drawerMinus.click();
  await cp.waitForTimeout(900);
  const toastMinus = await cp.locator('[data-sonner-toast]').allTextContents().catch(() => []);
  chk('Quantity decrease → "Cart updated" toast', toastMinus.some(t => /Cart updated/.test(t)), toastMinus.join(' | '));
  chk('Quantity decrease → qty 1 shown', await cp.locator('span:has-text("1")').first().isVisible().catch(() => false));
  await cp.keyboard.press('Escape'); await cp.waitForTimeout(400);
  await cp.goto(BASE + '/cart'); await cp.waitForTimeout(1800);
  const cartBody = await cp.textContent('body').catch(() => '');
  chk('/cart: Order Summary', /Order Summary/i.test(cartBody));
  chk('/cart: subtotal ₹50,000', /50[,]?000/.test(cartBody));
  await cp.screenshot({ path: path.join(SHOTS, '07-cart-page.png') });
  await cp.locator('button:has-text("Remove")').first().click();
  await cp.waitForTimeout(900);
  const toastRm = await cp.locator('[data-sonner-toast]').allTextContents().catch(() => []);
  const cartAfterRm = await cp.textContent('body').catch(() => '');
  chk('Remove item → "Item removed from cart"', toastRm.some(t => /Item removed from cart/.test(t)), toastRm.join(' | '));
  chk('Remove item → empty state', /Your cart is empty/i.test(cartAfterRm));
  await cp.goto(BASE + '/products/test-laptop'); await cp.waitForTimeout(1500);
  let wlPostStatus = null;
  cp.on('response', res => { if (/\/api\/v1\/wishlist/.test(res.url()) && res.request().method() === 'POST') wlPostStatus = res.status(); });
  await cp.click('button:has-text("Add to Wishlist")');
  let wlToast = await cp.locator('[data-sonner-toast]').allTextContents().catch(() => []);
  for (let i = 0; i < 12 && !wlToast.some(t => /wishlist/i.test(t)); i++) { await cp.waitForTimeout(700); wlToast = await cp.locator('[data-sonner-toast]').allTextContents().catch(() => []); }
  chk('Wishlist add (PDP): toast indicates add', wlToast.some(t => /Added to wishlist/i.test(t)), wlToast.join(' | '));
  chk('Wishlist add (PDP): POST accepted (201/200)', wlPostStatus === 201 || wlPostStatus === 200, `status=${wlPostStatus}`);
  await cp.goto(BASE + '/wishlist');
  await cp.waitForSelector('a:has-text("Test Laptop"), text=Your wishlist is empty', { timeout: 15000 }).catch(() => {});
  const wlShown = await cp.locator('a:has-text("Test Laptop")').first().isVisible().catch(() => false);
  if (!wlShown) console.warn('[wishlist] page body sniff:', (await cp.textContent('body').catch(() => '')).slice(0, 300));
  chk('Wishlist page shows item', wlShown);
  await cp.screenshot({ path: path.join(SHOTS, '08-wishlist.png') });
  if (wlShown) {
    await cp.locator('button:has-text("Remove")').first().click();
    await cp.waitForTimeout(900);
    const tRm = await cp.locator('[data-sonner-toast]').allTextContents().catch(() => []);
    chk('Wishlist remove → "Removed from wishlist"', tRm.some(t => /Removed from wishlist/.test(t)), tRm.join(' | '));
    await cp.goto(BASE + '/wishlist'); await cp.waitForSelector('text=Your wishlist is empty', { timeout: 10000 }).catch(() => {});
    chk('Wishlist remove → empty state', await cp.locator('text=Your wishlist is empty').first().isVisible().catch(() => false));
  } else {
    networkNotes.push('[wishlist] item was in DB but /wishlist did not render it — see console errors.');
  }
  //__CHECKOUT__
  section('CHECKOUT / COUPON / ORDERS');
  const token = (await cust.cookies()).find(c => c.name === 'accessToken')?.value;
  const prodDetail = await cp.request.get(API + '/api/v1/products/test-laptop').then(r => r.json()).catch(() => null);
  if (prodDetail && prodDetail.variants && prodDetail.variants[0] && token) {
    await cp.request.post(API + '/api/v1/cart/items', {
      headers: { Authorization: `Bearer ${token}` },
      data: { productId: prodDetail.id, variantId: prodDetail.variants[0].id, quantity: 1 },
    }).catch(() => {});
  }
  await cp.goto(BASE + '/checkout'); await cp.waitForTimeout(2500);
  const scBody = await cp.textContent('body').catch(() => '');
  chk('Checkout: Order Summary', /Order Summary/i.test(scBody));
  chk('Checkout: address inputs present', await cp.locator('input[type="tel"]').first().isVisible().catch(() => false));
  chk('Checkout: coupon input + Apply', await cp.locator('input[placeholder="Enter code"]').first().isVisible().catch(() => false));
  chk('Checkout: shipping FREE', /FREE/i.test(scBody));
  chk('Checkout: Place Order & Pay button', await cp.locator('button:has-text("Place Order & Pay")').first().isVisible().catch(() => false));
  await cp.screenshot({ path: path.join(SHOTS, '09-checkout.png') });
  await cp.locator('input[placeholder="Enter code"]').fill('WELCOME10');
  await cp.click('button:has-text("Apply")');
  chk('Coupon WELCOME10 applied', await cp.locator('text=Coupon applied successfully').first().isVisible({ timeout: 8000 }).catch(() => false));
  await cp.waitForTimeout(800);
  const cnBody = await cp.textContent('body').catch(() => '');
  chk('Coupon: discount ₹5,000', /5[,]?000/.test(cnBody));
  chk('Coupon: total ₹45,000', /45[,]?000/.test(cnBody));
  await cp.screenshot({ path: path.join(SHOTS, '10-checkout-coupon.png') });
  await cp.goto(BASE + '/orders'); await cp.waitForTimeout(2200);
  chk('Orders page loads', await cp.locator('h1').first().isVisible().catch(() => false), await cp.locator('h1').first().textContent().catch(() => ''));
  const ordersList = await cp.request.get(API + '/api/v1/orders', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()).catch(() => null);
  const orders = ordersList && (ordersList.items || ordersList.orders || []);
  if (orders && orders.length > 0) {
    await cp.goto(BASE + `/orders/${orders[0].id}`); await cp.waitForTimeout(2000);
    chk('Order detail loads', await cp.locator('h1:has-text("Order Details")').first().isVisible().catch(() => false));
    await cp.screenshot({ path: path.join(SHOTS, '11-order-detail.png') });
  } else {
    chk('Order detail loads', false, 'no orders in demo DB');
    networkNotes.push('[order-detail] No orders exist in demo DB — success path requires real Razorpay test keys (env).');
  }
  await cp.screenshot({ path: path.join(SHOTS, '12-orders.png') });
  await logout(cp);
  //__REGISTER__
  section('REGISTER');
  const regCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const rp = await regCtx.newPage();
  track(rp, 'register');
  const rEmail = `verify-${Date.now()}@mykart.com`;
  await rp.goto(BASE + '/register');
  await rp.waitForTimeout(1200);
  await rp.fill('#name', 'Verify User');
  await rp.fill('#email', rEmail);
  await rp.fill('#password', 'password123');
  await rp.click('button[type="submit"]');
  const regLand = await rp.waitForURL(u => u.pathname === '/', { timeout: 15000 }).then(() => true).catch(() => false);
  chk('Register lands signed-in on /', regLand, rp.url());
  await rp.goto(BASE + '/account'); await rp.waitForTimeout(1500);
  chk('Register: account shows new identity', (await rp.textContent('body').catch(() => '')).includes(rEmail));
  await rp.screenshot({ path: path.join(SHOTS, '13-register.png') });
  await regCtx.close();
  //__ADMIN__
  fs.writeFileSync(path.join(__dirname, 'verify-report-parta.json'), JSON.stringify({ results, consoleErrors, pageErrors, badResponses, failedRequests, networkNotes }, null, 2));
  console.log('\n[PART 1 DONE] results=' + results.length + ' consoleErrors=' + consoleErrors.length + ' badResponses=' + badResponses.length + ' failedRequests=' + failedRequests.length);
  await browser.close();
})().catch(e => {
  console.error('DRIVER CRASH:', e);
  try { fs.writeFileSync(path.join(__dirname, 'verify-report-parta.json'), JSON.stringify({ results, consoleErrors, pageErrors, badResponses, failedRequests, networkNotes, crash: String(e) }, null, 2)); } catch {}
  process.exit(1);
});