# MyKart — Technical Interview Preparation & Architecture Guide

This document provides technical interview Q&A breakdowns, architecture explanations, trade-off analyses, and design decisions for **MyKart**.

---

## 🎯 1. Elevator Pitches

### A. 30-Second Explanation
> "MyKart is a full-stack multi-vendor e-commerce marketplace built with Next.js 16 App Router, NestJS 10, PostgreSQL, Prisma, Redis, and Meilisearch. It features dedicated portals for Customers, Sellers, and Admins across an initial baseline catalog of 110 products. I engineered it as a clean Modular Monolith to guarantee single-database ACID transactions during checkout while maintaining enterprise security with dual JWT refresh-token rotation, RBAC, and IDOR protection."

### B. 1-Minute Explanation
> "MyKart is an enterprise-grade multi-vendor e-commerce application designed for high performance, transactional reliability, and security. On the frontend, Next.js 16 App Router provides server-rendered product discovery and client-state synchronization. On the backend, NestJS 10 enforces a domain-bounded Modular Monolith architecture. Key technical features include sub-10ms fuzzy search via Meilisearch with a graceful PostgreSQL search fallback, Redis TTL reservation locks to prevent stock overbooking, dual-token JWT authentication using short-lived access tokens and 7-day HttpOnly refresh cookies with reuse detection, server-side IDOR ownership validation, and full Playwright E2E browser automation across desktop and mobile viewports."

### C. 3-Minute Architecture Deep Dive
> "MyKart follows a multi-tier Modular Monolith design. 
> At the presentation layer, Next.js 16 App Router leverages React 19 Server Components for high-speed page rendering, while React Context manages transient cart and session states. 
> The application layer is a NestJS 10 REST API organized into isolated domain modules—Auth, Users, Products, Cart, Orders, Inventory, Seller, Admin, Analytics, Coupons, Reviews, Wishlist, and Notifications.
> For data storage, PostgreSQL hosted on Neon serves as the primary relational source of truth managed via Prisma ORM 7. Redis handles in-memory token revocation, rate limiting, and 15-minute inventory reservation locks during checkout. Meilisearch provides typo-tolerant full-text search with an automatic PostgreSQL search fallback when unconfigured.
> Application startup completes in under 2 seconds by executing lightweight admin initialization (`ensureAdminUser()`), while heavy catalog and analytics seeding run on-demand via protected admin endpoints (`POST /api/v1/admin/seed-catalog`, `POST /api/v1/admin/seed-history`).
> I intentionally chose a Modular Monolith over microservices because e-commerce checkouts demand single-database ACID transactional atomicity (`$transaction` in Prisma) across cart clearing, stock reservation, and order line-item generation. This eliminates inter-service network latency, serialization costs, and distributed saga complexity while keeping clear module boundaries for future microservice migration if scale requires it."

---

## 🛠️ 2. Technology Rationale & Selection

### Why Next.js 16 (App Router)?
Next.js 16 App Router provides Server-Side Rendering (SSR) and Server Components for optimal SEO and fast initial page loads on catalog pages, combined with smooth client-side navigation for dynamic portals (Cart, Checkout, Seller Center, Admin Panel).

### Why NestJS 10?
NestJS provides an enterprise TypeScript framework with built-in dependency injection, modular encapsulation, DTO validation pipes (`class-validator`), guards (`PermissionsGuard`), and interceptors. It brings strict architectural discipline to Node.js backend development.

### Why PostgreSQL (Neon)?
PostgreSQL is the industry benchmark for relational e-commerce data demanding strict ACID compliance, foreign key constraints, complex joins across 16 models, and schema migrations. Neon provides serverless autoscaling and branchable database instances.

### Why Prisma ORM 7?
Prisma provides end-to-end type safety from schema definition to TypeScript query builders, eliminating SQL injection risks through parameterized queries while offering clean `$transaction` syntax for multi-table atomic updates.

### Why Redis 7?
Redis provides sub-millisecond in-memory caching for token revocation checks, rate limiting counters via `@nestjs/throttler`, and temporary stock reservation locks (`INVENTORY_RESERVATION_TTL_MS = 900000`) during checkout flows.

### Why Meilisearch?
Meilisearch provides sub-10ms typo-tolerant full-text search out of the box with minimal memory footprint compared to Elasticsearch, supporting dynamic facets for category, brand, rating, price, and discount filters, with a built-in PostgreSQL database fallback for unconfigured environments.

### Why Modular Monolith?
E-commerce checkout is inherently transactional. Combining Cart, Inventory, and Orders in a single NestJS process with a single PostgreSQL database allows atomic `$transaction` execution, guaranteeing zero stock overselling without eventual consistency bugs.

### Why NOT Microservices?
Microservices introduce immense operational complexity—distributed tracing, gRPC/REST inter-service latency, network partitioning risks, and distributed saga patterns for multi-table transactions. For MyKart's scale, a Modular Monolith offers maximum velocity, zero network overhead, and clean module encapsulation.

---

## 🔐 3. Authentication & Security

### Authentication Flow
1. User submits credentials.
2. NestJS Auth Module validates identity via Bcrypt password check.
3. Issues a 15-minute JWT Access Token in JSON response for `Authorization: Bearer` headers.
4. Issues a 7-day Refresh Token in an **HttpOnly, Secure, SameSite=Lax/Strict** cookie.
5. Saves the Argon2 hash of the active refresh token in `User.refreshTokenHash`.

### Refresh Token Rotation & Token-Family Reuse Detection
During token refresh (`POST /api/v1/auth/refresh`), the API verifies the refresh cookie against `User.refreshTokenHash`. If valid, a new access token and new refresh token are issued (Rotation). If an old or previously used token is presented, the system detects potential theft and immediately invalidates the entire token family (`User.refreshTokenHash = null`).

### Role-Based Access Control (RBAC)
Decorators (`@Roles('CUSTOMER', 'SELLER', 'ADMIN')`) annotate NestJS route handlers. `PermissionsGuard` extracts the caller's JWT role and enforces permissions before execution.

### IDOR (Insecure Direct Object Reference) Prevention
Server-side handlers explicitly verify resource ownership against the JWT user payload:
```typescript
if (user.role !== 'ADMIN' && order.userId !== user.id) {
  throw new ForbiddenException('Access denied');
}
```

---

## 📦 4. Core Domain Design

### Cart Architecture
Guest cart state persists in browser LocalStorage. Upon user login, client cart items merge into server database cart records (`CartItem` table) to maintain state across devices.

### Inventory Consistency & Checkout Flow
When a user clicks "Proceed to Checkout", Redis sets an inventory reservation key with a 15-minute TTL (`INVENTORY_RESERVATION_TTL_MS`). Upon simulated payment confirmation, a Prisma `$transaction` atomically creates the `Order` record, deducts stock count from `Inventory`, creates an `InventoryTransaction` audit record, and clears the user's `Cart`.

### Seller Isolation
Seller accounts are linked to a `Seller` store record (`seller.id`). All seller endpoints (`/api/v1/seller/*`) check both `SELLER` role authorization and IDOR store ownership, preventing sellers from viewing or modifying other sellers' products or orders.

### Admin Authorization
Admin endpoints (`/api/v1/admin/*`) require the `ADMIN` role. Admins can view marketplace GMV analytics, verify seller applications, promote user roles, and govern product categories/brands.

---

## 🚀 5. Engineering Challenges, Trade-offs & Scale

### Major Technical Challenges Fixed
1. **Admin Role Demotion Prevention**: Guaranteed that existing `ADMIN` accounts calling seller onboarding (`SellersService.onboardSeller()`) retain `ADMIN` role rather than demoting to `SELLER`.
2. **Mobile Overlapping Sliders**: Developed custom `DualRangeSlider` component handling dual thumbs for price and discount ranges with clip track styling and 300ms debouncing.
3. **Analytics Sync**: Fixed Admin Dashboard stats aggregation to authoritatively calculate coupon counts and revenue metrics across all marketplace orders.

### Architectural Trade-offs Made
- *Trade-off*: Using Meilisearch instead of Elasticsearch. *Rationale*: Meilisearch offers significantly lower RAM usage and faster setup with built-in typo tolerance, though Elasticsearch scales better for petabyte-scale log analytics.
- *Trade-off*: Monolithic process vs. independent deployment pipelines. *Rationale*: Development speed, operational simplicity, and atomic database transactions outweigh independent deployment decoupling at current scale.

### What Would Be Improved at Hyper-Scale?
1. **Read Replicas**: Separate PostgreSQL read replicas for catalog browsing and search indexing.
2. **Event Streaming**: Introduce Apache Kafka or RabbitMQ for asynchronous order processing, email notifications, and analytics pipelines.
3. **CDN Asset Optimization**: Implement automatic WebP/AVIF image transformations at edge CDN locations.
