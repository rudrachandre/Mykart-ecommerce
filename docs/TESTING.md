# MyKart — Testing & QA Specification

MyKart is backed by a dual-layer testing pipeline comprising **Jest Unit/Integration Tests** and an automated **Playwright E2E Multi-Viewport Test Suite**.

---

## 🧪 1. Unit & Integration Testing (Jest)

The NestJS backend API incorporates unit and integration test suites validating permissions, controller behavior, and business service contracts.

```bash
# Run backend API test suites
npm test -w apps/api
```

### Unit Test Results
- **Test Suites Passed**: `3 / 3`
- **Total Tests Passed**: `24 / 24`
- **Coverage**: `PermissionsGuard`, `AppController`, `InventoryService` (including stock reservations, low-stock warnings, and bulk inventory updates).

---

## 📱 2. End-to-End Multi-Viewport Testing (Playwright)

Automated Playwright browser testing validates customer, seller, and admin user journeys across desktop and mobile screens against the live production environment (`https://mykart-ecommerce-web.vercel.app`).

### Tested Viewports
1. **Desktop Standard**: `1440 x 900`
2. **Mobile Viewport A (iPhone 14/15)**: `390 x 844`
3. **Mobile Viewport B (Pixel 7/8)**: `412 x 915`

### Tested Route Matrix (27 Routes per Viewport)
- **Customer Pages**: `/`, `/products`, `/categories`, `/brands`, `/cart`, `/checkout`, `/login`, `/register`, `/account`, `/account/orders`, `/account/wishlist`, `/account/notifications`, `/account/addresses`, `/account/profile`
- **Seller Pages**: `/seller`, `/seller/products`, `/seller/inventory`, `/seller/orders`, `/seller/reviews`, `/seller/coupons`, `/seller/settings`
- **Admin Pages**: `/admin`, `/admin/analytics`, `/admin/products`, `/admin/orders`, `/admin/users`, `/admin/categories`, `/admin/brands`

---

## 📊 3. Production QA Metrics Summary

| Metric | Result | Status |
| :--- | :--- | :--- |
| **Console Runtime Errors** | `0` | **PASS** |
| **Failed Network Requests (4xx / 5xx)** | `0` | **PASS** |
| **Broken Images (`naturalWidth === 0`)** | `0` | **PASS** |
| **Horizontal Layout Overflows** | `0` | **PASS** |
| **API Build (`apps/api`)** | Code 0 | **PASS** |
| **Web Build (`apps/web`)** | Code 0 (52 static pages) | **PASS** |
| **Unit Test Suite** | 24 / 24 Passed | **PASS** |
| **Playwright E2E Regression** | 100% Passed | **PASS** |

---

## 🚀 4. How to Run E2E Tests Locally

```bash
# Run Playwright test suite
npx playwright test

# Run Playwright test suite in UI mode
npx playwright test --ui
```
