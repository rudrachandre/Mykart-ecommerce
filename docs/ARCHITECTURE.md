# MyKart — Modular Monolith Architecture & Technical Design

## 1. High-Level Architecture Diagram

MyKart follows a multi-tier client-server architecture built on a high-throughput **Modular Monolith**:

```text
Frontend Layer (Next.js 16 Web Application)
       │
       ▼  (HTTPS / REST API / JSON)
Backend API Layer (NestJS 10 REST API Server)
       │
       ▼
Application Modules (Auth, Products, Cart, Orders, Inventory, Seller, Admin)
       │
       ▼
Persistence & Infrastructure Layer
 ├── PostgreSQL (Neon Serverless Database via Prisma ORM 7)
 ├── Redis (Token invalidation, rate limiting, stock reservation TTL)
 ├── Meilisearch (Typo-tolerant search engine with PostgreSQL fallback)
 └── Cloudinary CDN (Image upload & media management)
```

---

## 2. Architectural Paradigm: Modular Monolith

> **"Microservices are intentionally not used."**

MyKart is intentionally engineered as a clean **Modular Monolith** rather than distributed microservices for key architectural reasons:

1. **ACID Transactional Integrity**: E-commerce operations (cart checkout, stock deduction, order generation) require atomic single-database transactions (`$transaction` in Prisma) to eliminate race conditions and overselling.
2. **Zero Inter-Service Latency**: In-process communication across modules avoids HTTP/gRPC network overhead, serialization costs, and distributed tracing complexity.
3. **Operational Simplicity**: Simplifies CI/CD deployment to Vercel and Render without orchestrating Kubernetes clusters, service meshes, or distributed saga pattern engines.
4. **Strict Domain Boundaries**: Each domain module maintains isolated services, DTOs, and controllers, allowing clean future extraction into separate microservices if required by scale.

---

## 3. Backend Module Breakdown

The NestJS backend (`apps/api/src/modules`) consists of 14 modular domains:

| Module | Responsibility & Scope |
| :--- | :--- |
| **`auth`** | Registration, login, Google OAuth 2.0 PKCE, dual JWT access/refresh token rotation, token family revocation. |
| **`users`** | User profile updates, delivery address book CRUD, role assignments. |
| **`products`** | Catalog listing, slug lookup, variant mapping, category/brand relations, rating calculations. |
| **`categories`** | Hierarchical category parent-child tree management. |
| **`brands`** | Authentic brand directory management. |
| **`search`** | Meilisearch background index sync, full-text fuzzy search execution, facet filtering. |
| **`cart`** | User cart persistence, item quantity adjustments, total calculations. |
| **`orders`** | Multi-step checkout execution, order state lifecycle engine (`PENDING` → `PROCESSING` → `SHIPPED` → `DELIVERED`). |
| **`inventory`** | Variant stock tracking, low-stock threshold monitoring, Redis stock reservation TTL locks. |
| **`seller`** | Seller store onboarding, seller product CRUD, seller stock inventory, seller order fulfillment. |
| **`admin`** | Executive GMV analytics, seller verification approvals, global user RBAC management. |
| **`analytics`** | Aggregated marketplace performance statistics (revenue, order counts, customer counts). |
| **`coupons`** | Promotional coupon validation, fixed/percentage discount calculations. |
| **`reviews`** | Customer product review submissions, rating aggregations, moderation status. |
| **`wishlist`** | Saved item wishlist management per customer. |
| **`notifications`**| Account and order update alerts. |

---

## 4. Frontend Route Organization

The Next.js 16 App Router (`apps/web/src/app`) organizes pages into 3 major user portal domains:

### Customer Portal
- `/` — Homepage featuring hero deal carousels, featured categories, and top-rated items.
- `/products`, `/products/[slug]` — Product catalog browsing, filtering, and detail page (PDP).
- `/categories`, `/categories/[slug]` — Category navigation & category product listings.
- `/brands`, `/brands/[slug]` — Brand catalog listings.
- `/search` — Full-text search results page with dual-range price & discount sliders.
- `/cart` — Itemized cart management with quantity controls and coupon input.
- `/checkout` — Address selection, payment method options (COD/UPI/Card), and order summary.
- `/account/*` — Customer portal: Orders history, Wishlist, Addresses, Profile, Notifications.

### Seller Center (`/seller/*`)
- `/seller` — Seller dashboard overview & metrics.
- `/seller/products`, `/seller/products/new`, `/seller/products/[slug]/edit` — Product management.
- `/seller/inventory` — Variant stock level management.
- `/seller/orders`, `/seller/orders/[id]` — Seller order fulfillment updates.
- `/seller/coupons` — Seller promotional coupon manager.
- `/seller/onboard` — Seller application onboarding flow.

### Admin Control Panel (`/admin/*`)
- `/admin` — Executive dashboard overview (GMV, active users, total orders, active coupons).
- `/admin/analytics` — Detailed performance & revenue analytics.
- `/admin/sellers`, `/admin/sellers/[id]` — Seller verification & store approval controls.
- `/admin/users` — User list & role modification controls.
- `/admin/categories`, `/admin/brands` — Global category tree and brand catalog management.
- `/admin/products`, `/admin/orders`, `/admin/inventory` — Global marketplace governance.

---

## 5. End-to-End Data Flows

### A. Authentication Data Flow
```text
User Submits Credentials / Google OAuth -> Auth Controller -> Passport Strategy
 -> Validate Credentials -> Generate 15-min Access Token (JSON) + 7-day Refresh Token
 -> Store Argon2 Refresh Token Hash in DB -> Set HttpOnly, Secure Cookie -> Return Payload
```

### B. Product Discovery Data Flow
```text
User Enters Search Query / Filter -> Next.js Product Catalog Component
 -> REST API GET /api/v1/search (or /api/v1/products) -> Search Service / Meilisearch
 -> Returns Filtered Products + Facet Counts -> Render Product Grid
```

### C. Cart & Checkout Data Flow
```text
User Clicks 'Add to Cart' -> Cart Context / REST API POST /api/v1/cart/items -> DB Sync
 -> User Navigates /checkout -> POST /api/v1/orders -> Validate Stock & Apply Reservation Lock (Redis TTL)
 -> Process Simulated Payment -> Execute Prisma $transaction (Create Order, Deduct Inventory, Clear Cart)
 -> Return Order Confirmation -> Render Order Success Page
```

### D. Seller Operations Data Flow
```text
Seller Updates Stock Count -> Seller Inventory Component -> PUT /api/v1/seller/inventory
 -> PermissionsGuard (Validates SELLER role + IDOR Store Ownership)
 -> InventoryService -> Update Variant Stock -> Audit Log -> Return Updated Inventory
```

### E. Admin Operations Data Flow
```text
Admin Views Dashboard -> Admin Analytics Component -> GET /api/v1/admin/analytics
 -> PermissionsGuard (Validates ADMIN role) -> AnalyticsService
 -> Aggregate Orders, Revenue, Coupons, Users -> Return Verified Performance Matrix
```
