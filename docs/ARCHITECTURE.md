# System Architecture & Technical Design

## 1. System Flow & Data Pipelines

MyKart follows a multi-tier client-server architecture built on a high-throughput **Modular Monolith**:

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
| (Prisma ORM) |   | (Tokens/TTL) |   | (Search Engine)| |(Cloudinary/  |
| Primary Data |   | Sessions     |   | Fuzzy Index  |   | Razorpay/    |
| Source       |   | Rate Limits  |   | Auto-complete|   | Resend)      |
+--------------+   +--------------+   +--------------+   +--------------+
```

---

## 2. Architectural Paradigm: Why Modular Monolith?

> **"Microservices are intentionally not used."**

MyKart is intentionally designed as a **Modular Monolith** in NestJS and Next.js 16 rather than distributed microservices for several core engineering reasons:
1. **Data Consistency & Transactions**: E-commerce transactions require strict ACID atomicity across Cart, Orders, Stock Reservations, and Payments. A modular monolith enables single-database transactional integrity via Prisma transactions (`$transaction`), avoiding complex distributed saga patterns or eventual consistency anomalies.
2. **Simplified Deployment & Reduced Latency**: Zero inter-service network overhead or gRPC complexity. All domain modules (Catalog, Orders, Auth, Users, Inventory) run in a unified, highly efficient NestJS runtime deployed on Render.
3. **Domain-Driven Module Boundaries**: Each domain module (`modules/auth`, `modules/products`, `modules/orders`, `modules/inventory`, `modules/seller`, `modules/admin`) maintains isolated logic, controllers, and services, allowing clean future extraction into separate microservices if required by hyper-scale demands.

---

## 3. External Integrations

- **Google OAuth 2.0 (PKCE)**: Federated user authentication via Google Accounts.
- **Razorpay Payments**: Payment gateway integration supporting cards, UPI, net banking, and COD fallback.
- **Cloudinary CDN**: Automated image upload, optimization, and responsive web formatting.
- **Resend**: Transactional email notification delivery for order placement, shipment tracking, and account updates.

---

## 4. Key Architectural Subsystems

### Authentication & Authorization (RBAC)
- **JWT Dual-Token Architecture**: Short-lived Access Tokens (15 minutes) issued in memory/header for stateless API requests; long-lived Refresh Tokens (7 days) persisted in HttpOnly, SameSite, Secure cookies.
- **Role-Based Access Control (RBAC)**: NestJS `@Roles('CUSTOMER', 'SELLER', 'ADMIN')` decorators enforced globally via `PermissionsGuard`.

### Database Layer & Prisma ORM
- Hosted on **Neon Serverless PostgreSQL**.
- Models: `User`, `Account`, `Session`, `Seller`, `Product`, `Category`, `Brand`, `ProductVariant`, `Inventory`, `Order`, `OrderItem`, `Review`, `Wishlist`, `Coupon`, `Notification`.

### Inventory Source of Truth & Concurrency Control
- Stock is tracked per `ProductVariant` inside the `Inventory` table.
- Stock reservations use an automated TTL window (`INVENTORY_RESERVATION_TTL_MS = 900000` / 15 mins) backed by Redis locks to prevent double-booking during active checkout flows.

### Search Engine Integration
- **Meilisearch**: Provides sub-10ms fuzzy text search, autocomplete suggestions, dynamic price filtering, category facets, and brand filter options.

### Observability & Security Boundaries
- Global NestJS `HttpExceptionFilter` sanitizes error tracebacks in production.
- Rate limiting implemented via Redis sliding window counter.
- Server-side resource ownership validation prevents IDOR attacks across endpoints.
