# MyKart — Technical Portfolio Project Report

---

## 1. Abstract
**MyKart** is a production-grade multi-vendor e-commerce marketplace built using Next.js 16 (App Router), NestJS 10, PostgreSQL (Neon), Prisma ORM 7, and Redis. The platform delivers an enterprise shopping experience for customers while offering operational management portals for sellers and system administrators. Engineered as a clean **Modular Monolith**, the system emphasizes ACID transactional consistency, sub-10ms fuzzy search via Meilisearch (with automatic PostgreSQL database fallback), dual JWT access/refresh-token rotation, role-based authorization (RBAC), fast <2s idempotent boot, and 100% responsive user interface design across desktop and mobile viewports.

---

## 2. Problem Statement
Traditional e-commerce web applications often suffer from fragmented architectures, high search latency, weak mobile responsiveness, and vulnerable authentication mechanisms. Building an enterprise marketplace requires balancing complex inventory concurrency, multi-role security boundaries (Customer, Seller, Admin), real-time search indexing, and resilient payment workflows without introducing the operational overhead and eventual-consistency risks of distributed microservices.

---

## 3. Objectives
- **Architect a High-Performance Modular Monolith**: Design a domain-bounded NestJS backend API connected via Prisma ORM to PostgreSQL.
- **Deliver a Responsive Frontend**: Build a modern, accessible user interface in Next.js 16 App Router and Tailwind CSS.
- **Implement Enterprise Authentication & RBAC**: Combine federated Google OAuth 2.0 and credential sign-in with short-lived JWT access tokens and HttpOnly, Secure refresh-token cookie rotation.
- **Enable Sub-10ms Search & Discovery**: Deploy Meilisearch for typo-tolerant full-text search, autocomplete suggestions, and dynamic facet filtering, backed by a seamless PostgreSQL search fallback.
- **Build Multi-Role Operational Portals**: Establish dedicated suites for Customer Account Management, Seller Inventory Control, and Admin Marketplace Governance.
- **Guarantee Zero Visual & Layout Regressions**: Validate 100% layout integrity across desktop (1440x900) and mobile (390x844, 412x915) screen resolutions.

---

## 4. System Architecture

MyKart implements a tier-separated Modular Monolith architecture:

```text
+-----------------------------------------------------------------------+
|                             USER CLIENTS                              |
|           Desktop (1440x900)  |  Mobile (390x844 / 412x915)           |
+-----------------------------------------------------------------------+
                                   |  (HTTPS / REST / JSON)
                                   v
+-----------------------------------------------------------------------+
|                    FRONTEND APP (Next.js 16 App Router)               |
|      React 19 Server Components, Client State Sync, Tailwind UI      |
+-----------------------------------------------------------------------+
                                   |  (REST API / JWT Auth)
                                   v
+-----------------------------------------------------------------------+
|                    BACKEND REST API (NestJS 10 Monolith)              |
|   Auth Guard  |  RBAC Guard  |  Validation Pipe  |  Module Controllers |
+-----------------------------------------------------------------------+
       |                  |                  |                  |
       v                  v                  v                  v
+--------------+   +--------------+   +--------------+   +--------------+
| Neon Postgres|   | Redis Cache  |   | Meilisearch  |   | Integrations |
| (Prisma ORM) |   | (Tokens/TTL) |   | (Search Engine)| | (Cloudinary/ |
| Primary Data |   | Lock Window  |   | Fuzzy Index  |   |  Resend)     |
+--------------+   +--------------+   +--------------+   +--------------+
```

### Architectural Rationale: Why Modular Monolith?
> **"Microservices are intentionally not used."**

1. **ACID Transactional Atomicity**: E-commerce checkout requires atomic operations spanning Cart state clearing, Inventory reservation deduction, Order line item creation, and Payment verification. Single-database `$transaction` blocks in Prisma ensure strict ACID guarantees without complex distributed saga patterns.
2. **Zero Network Latency Between Modules**: In-process invocation across domain modules eliminates inter-service HTTP/gRPC latency and network failure modes.
3. **Clean Module Boundaries**: Functionality is divided into domain modules (`auth`, `users`, `products`, `cart`, `orders`, `inventory`, `seller`, `admin`, `analytics`, `coupons`, `reviews`, `wishlist`, `notifications`), maintaining strict encapsulation for future scaling.

---

## 5. Technology Stack

- **Frontend**: Next.js 16 (App Router), React 19, Tailwind CSS, Lucide Icons, Shadcn UI
- **Backend API**: NestJS 10, TypeScript (Strict Mode), Class-Validator, Passport Strategies
- **Database & Persistence**: Serverless PostgreSQL (Neon), Prisma ORM 7
- **Caching & Lock Engine**: Redis 7 (Token invalidation, rate limiting, stock reservation TTL)
- **Search & Services**: Meilisearch, Cloudinary CDN, Resend
- **Testing Frameworks**: Jest, Playwright E2E

---

## 6. Database Schema Design

The database schema (`prisma/schema.prisma`) models 16 relational entities:
- `User` & `Account`: Core user credentials, roles (`CUSTOMER`, `SELLER`, `ADMIN`), OAuth linkages, and refresh token hashes.
- `Seller`: Seller business details, store name, slug, verification status.
- `Product`, `Category`, `Brand`, `ProductVariant`: Catalog taxonomy hierarchy and variant stock associations.
- `Inventory` & `InventoryTransaction`: Stock levels, reservation timestamps, and audit ledger.
- `Order` & `OrderItem`: Order state transitions (`PENDING`, `PROCESSING`, `SHIPPED`, `DELIVERED`, `CANCELLED`), price tracking, shipping metadata.
- `Review`, `Wishlist`, `Coupon`, `Notification`: Customer feedback, wishlist items, discount coupons, and transactional alerts.

---

## 7. Major System Modules

1. **Auth Module**: Registration, login, Google OAuth 2.0, dual JWT rotation, refresh token family revocation.
2. **Product & Catalog Module**: Catalog listing, variant handling, image mapping, brand taxonomy, rating aggregations.
3. **Search & Discovery Module**: Meilisearch background index sync, typo-tolerant full-text query processing, dynamic dual-range price & discount sliders.
4. **Cart Module**: Client-side state persistence synchronized to server database records upon login.
5. **Checkout & Orders Module**: Multi-step checkout, stock check validations, coupon redemption, shipping address selection, order state management.
6. **Inventory Module**: Variant stock tracking, low-stock threshold alerts, Redis TTL reservation locks (`INVENTORY_RESERVATION_TTL_MS = 900000`).
7. **Seller Module**: Seller store onboarding, catalog management, inventory adjustments, order fulfillment.
8. **Admin Module**: Executive GMV analytics, seller verification approvals, global user role management, catalog governance.

---

## 8. Authentication & Security Specifications

- **Dual-Token Architecture**: Short-lived (15 min) JWT Access Tokens passed via headers; long-lived (7 day) Refresh Tokens stored in HttpOnly, Secure, SameSite cookies.
- **Token Rotation & Reuse Protection**: Refreshing access tokens invalidates the previous refresh token. Detecting reuse immediately revokes the token family.
- **Server-Side Ownership Verification (IDOR Protection)**: Sensitive endpoints explicitly verify server-side resource ownership against caller JWT claims.
- **Role-Based Access Control (RBAC)**: Custom `@Roles()` decorators and NestJS `PermissionsGuard` enforce Customer, Seller, and Admin access boundaries.
- **Zero Exposed Secrets**: All sensitive keys strictly managed through environment variables and excluded from version control (`.gitignore`).

---

## 9. Testing & Quality Assurance

- **Backend Unit & Integration Tests**: 24 Jest unit tests covering `PermissionsGuard`, `AppController`, and `InventoryService` (stock reservations, low-stock alerts, inventory adjustments).
- **Playwright E2E Multi-Viewport Suite**: Automated browser regression testing across 27 routes in Desktop (`1440x900`) and Mobile (`390x844`, `412x915`) viewports.
- **Quality Metrics**: 0 Console errors, 0 failed network requests, 0 broken images, 0 horizontal layout overflows.

---

## 10. Deployment Architecture

- **Frontend Web App**: Deployed on **Vercel** (`https://mykart-ecommerce-web.vercel.app`) with serverless edge rendering.
- **Backend API Server**: Deployed on **Render** (`https://mykart-ecommerce.onrender.com`) as a Node.js web service.
- **Database**: Hosted on **Neon Serverless PostgreSQL**.

---

## 11. Engineering Challenges & Solutions

- **Challenge**: Mobile filter usability for overlapping price and discount ranges.
  *Solution*: Engineered custom `DualRangeSlider` component using stacked range inputs with CSS clip highlights and built-in 300ms debouncing.
- **Challenge**: Stock overbooking during concurrent checkout flows.
  *Solution*: Implemented automated Redis TTL reservation locks during checkout initiation, holding stock temporarily until order completion or timeout expiry.
- **Challenge**: Preventing unauthorized role escalation during seller onboarding.
  *Solution*: Hardened `SellersService.onboardSeller()` to explicitly preserve existing `ADMIN` role assignments, guaranteeing Admin users can onboard sellers without role demotion.

---

## 12. Results & Verified Baseline

- **Initial Baseline Catalog**: 110 authentic baseline products across 8 parent categories and 46 verified brands (expandable via seller products).
- **100% Build & Test Pass Rate**: Clean compilation across API build, Web build, Jest unit tests, and Playwright E2E suites.
- **Production Demo Access**: Live-verified demo credentials configured for technical evaluation:
  - **Customer**: `customer@mykart.test` / `MyKart@123` (`/login`)
  - **Seller**: `seller@mykart.test` / `MyKart@123` (`/login` → `/seller`)
  - **Admin**: `admin@mykart.test` / `MyKart@123` (`/login` → `/admin`)
- **Fast Startup Performance**: Boot completes in **< 2 seconds** with `ensureAdminUser()`; catalog/history seeding accessible via admin API.

---

## 13. Future Scope

- Webhook integration for external payment provider settlement callbacks.
- Personalization engine for AI-assisted product recommendations based on search history.
- Multi-currency localization support for international checkout flows.

---

## 14. Conclusion

MyKart demonstrates that full-stack e-commerce applications can achieve high throughput, enterprise security, and excellent developer ergonomics by combining Next.js 16 Server Components with a NestJS Modular Monolith architecture.
