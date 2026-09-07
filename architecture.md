# MyKart — Full-Stack Modular Monolith Architecture

## 1. System Vision & Paradigm

MyKart is a production-grade multi-vendor e-commerce marketplace built as a clean **Modular Monolith** in NestJS 10 and Next.js 16 (App Router).

> **"Microservices are intentionally not used."**

### Architectural Rationale
- **ACID Transactional Consistency**: E-commerce checkouts demand atomic database operations across Cart clearing, Inventory reservation deduction, and Order creation. A modular monolith enables single-database `$transaction` execution in Prisma without complex distributed sagas.
- **Zero Inter-Service Network Overhead**: Eliminates network latency, gRPC serialization costs, and distributed tracing complexity.
- **Domain-Driven Cohesion**: Clear separation of concern across isolated NestJS domain modules (`auth`, `users`, `products`, `cart`, `orders`, `inventory`, `seller`, `admin`).

---

## 2. High-Level Data Architecture Pipeline

```text
Next.js 16 Web Application (Frontend)
       │
       ▼  (HTTPS / REST API)
NestJS 10 REST API Server (Backend Monolith)
       │
       ├── Domain Modules (Auth, Products, Cart, Orders, Inventory, Seller, Admin)
       │
       ▼
Persistence & Infrastructure
 ├── PostgreSQL (Neon Serverless Database via Prisma ORM 7)
 ├── Redis 7 (Token invalidation, rate limiting, stock reservation TTL)
 ├── Meilisearch (Typo-tolerant full-text search engine)
 └── Cloudinary CDN (Image upload & media management)
```

---

## 3. Technology Stack

- **Frontend**: Next.js 16 (App Router), React 19, Tailwind CSS, Lucide Icons, Shadcn UI
- **Backend API**: NestJS 10, TypeScript (Strict Mode), Class-Validator, Guards, Interceptors
- **Database & Persistence**: Serverless PostgreSQL (Neon), Prisma ORM 7
- **Caching & Locks**: Redis 7 (Token revocation, rate limiting, stock reservation TTL)
- **Search Engine**: Meilisearch (Sub-10ms fuzzy full-text search & faceted filtering)
- **Media CDN**: Cloudinary
- **Notifications**: Resend (Transactional emails)
- **Testing**: Jest (Unit/Integration) & Playwright (E2E Multi-Viewport)

---

## 4. User Roles & RBAC Matrix

1. **Customer**: Product discovery, live search, cart management, checkout, order tracking, address book, wishlist, reviews.
2. **Seller (`SELLER`)**: Store onboarding, product creation/editing, inventory stock controls, order fulfillment status, coupon management.
3. **Admin (`ADMIN`)**: Marketplace GMV analytics, seller verification approvals, global user role management, category & brand governance.

---

## 5. End-to-End Core Data Flows

1. **Authentication Flow**: Credential/OAuth login → NestJS Auth Strategy → Issue 15-min JWT Access Token + 7-day HttpOnly Refresh Cookie → Hash stored in DB → Return payload.
2. **Search & Discovery Flow**: Query → REST API GET /api/v1/search → Meilisearch Fuzzy Index → Return Results + Facet Counts.
3. **Checkout & Order Lifecycle Flow**: Checkout -> Stock reservation (Redis TTL) -> Process Simulated Payment -> Execute Prisma `$transaction` (Create Order, Deduct Stock, Clear Cart) -> Transition Order status (`PENDING` -> `PROCESSING` -> `SHIPPED` -> `DELIVERED`).
4. **Seller Operations Flow**: Seller updates stock/status -> PermissionsGuard (SELLER role + IDOR ownership check) -> Update DB -> Audit log.
5. **Admin Operations Flow**: Admin requests dashboard -> PermissionsGuard (ADMIN role) -> Aggregate metrics -> Return GMV analytics.
