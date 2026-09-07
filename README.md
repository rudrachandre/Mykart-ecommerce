# MyKart — Premium Full-Stack E-Commerce Marketplace

[![Next.js 16](https://img.shields.io/badge/Next.js-16_App_Router-000000?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![NestJS 10](https://img.shields.io/badge/NestJS-10.0-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)](https://nestjs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![PostgreSQL Neon](https://img.shields.io/badge/Database-Neon_PostgreSQL-00E599?style=for-the-badge&logo=postgresql&logoColor=white)](https://neon.tech)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)

**MyKart** is a high-performance, full-stack multi-vendor e-commerce marketplace engineered as a clean **Modular Monolith** in Next.js 16 (App Router) and NestJS 10. Built to deliver an enterprise shopping experience, MyKart features role-based workflows for **Customers**, **Sellers**, and **Admins**, sub-10ms fuzzy search via Meilisearch, automated inventory reservation TTLs backed by Redis, dual JWT access/refresh-token rotation with HttpOnly cookie persistence, and 100% mobile/desktop responsiveness.

---

## 🚀 Live Demo & Production Links

- **Live Storefront (Vercel)**: [https://mykart-ecommerce-web.vercel.app](https://mykart-ecommerce-web.vercel.app)
- **Production REST API (Render)**: [https://mykart-ecommerce.onrender.com](https://mykart-ecommerce.onrender.com)
- **Interactive Swagger OpenAPI Docs**: [https://mykart-ecommerce.onrender.com/api/docs](https://mykart-ecommerce.onrender.com/api/docs)
- **GitHub Repository**: [https://github.com/rudrachandre/Mykart-ecommerce](https://github.com/rudrachandre/Mykart-ecommerce)

> **Note on Payment Gateway**: Payment method selection (Cash on Delivery, UPI, Credit/Debit Card) uses application-level simulated payment verification flows for demo purposes without external gateway processing.

---

## 🎯 1. Problem & Engineering Solution

### Problem
Traditional e-commerce web applications often suffer from fragmented architectures, high search latency, poor mobile responsiveness, and vulnerable authentication flows. Microservice implementations frequently introduce complex distributed transaction failures, eventual-consistency bugs, and inter-service network overhead for core operations like checkout and inventory deduction.

### Solution
MyKart solves these challenges by combining Next.js 16 Server Components with a domain-bounded NestJS 10 **Modular Monolith**. Single-database `$transaction` blocks in Prisma ensure strict ACID compliance across cart checkout and stock reservation. Redis handles token invalidation and 15-minute stock reservation TTL locks, while Meilisearch provides typo-tolerant full-text search indexed directly from database transactions.

---

## 💡 2. Recruiter-Friendly Engineering Highlights

- **Modular Monolith Architecture**: Isolated NestJS domain modules (`auth`, `users`, `products`, `cart`, `orders`, `inventory`, `seller`, `admin`) with zero inter-service network latency or distributed saga complexity.
- **Enterprise JWT Security**: Short-lived (15 min) JWT Access Tokens paired with 7-day HttpOnly, Secure, SameSite refresh token cookies featuring automatic **token-family reuse detection** and revocation.
- **Role-Based Access Control (RBAC)**: Custom NestJS `@Roles()` metadata and `PermissionsGuard` enforcing Customer, Seller, and Admin boundaries across API routes.
- **Insecure Direct Object Reference (IDOR) Protection**: Server-side user ownership validation on every sensitive endpoint (orders, addresses, seller inventory).
- **Sub-10ms Full-Text Search**: Meilisearch fuzzy index integration with dynamic multi-facet filtering (category, brand, rating, dual-range price & discount sliders).
- **Concurrency & Inventory TTL Locks**: Redis key TTL locks (`INVENTORY_RESERVATION_TTL_MS = 900000`) preventing double-booking during concurrent checkout flows.
- **Automated Testing & QA Verification**: 24 Jest unit test suites and Playwright E2E automation validating 27 routes across Desktop (1440x900) and Mobile (390x844, 412x915) viewports with **0 console errors, 0 broken images, and 0 layout overflows**.

---

## 🔥 3. Feature Breakdown

### 🛒 Customer Experience
- **Authentication**: Email/password sign-in and federated Google OAuth 2.0 PKCE integration.
- **Product Discovery & Search**: Typo-tolerant live search, autocomplete modal, dual-range price & discount sliders, brand selector with instant search.
- **Cart & Checkout**: Persistent cart state, dynamic quantity controls, coupon redemption, shipping address selection, simulated checkout verification.
- **Account Suite**: Order status timeline (`PENDING` → `PROCESSING` → `SHIPPED` → `DELIVERED`), interactive wishlist, delivery address book, notification alerts, profile management.

### 🏭 Seller Center (`/seller`)
- **Seller Store Onboarding**: Application workflow for registering seller stores.
- **Product Management**: Add/edit catalog items, variant mapping, image gallery links.
- **Inventory Control**: Real-time stock counts, low-stock threshold alerts, bulk inventory updates.
- **Order Fulfillment**: Track customer orders containing store items and update fulfillment status.
- **Promotions & Reviews**: Store-level discount coupon manager and buyer review monitoring.

### 🛡️ Admin Control Panel (`/admin`)
- **Executive Analytics**: Gross Merchandise Value (GMV), 30-day historical order trends, top category distributions, active coupon metrics.
- **Seller Verification**: Review and approve pending seller onboarding applications.
- **User RBAC Governance**: Role assignments (`CUSTOMER`, `SELLER`, `ADMIN`) and account status controls.
- **Catalog Governance**: Manage global parent/sub-categories and authentic brand definitions.

### ⚙️ Platform & Engineering
- **Modular Backend Services**: Strict separation of concerns across 14 NestJS domain modules.
- **Type Safety**: End-to-end TypeScript (Strict Mode) across Next.js frontend, NestJS API, and Prisma ORM schemas.
- **Error Handling & Observability**: Global `HttpExceptionFilter` sanitizing production tracebacks and structured audit logs.

---

## 🛠️ 4. Technology Stack

| Layer | Technology | Purpose & Implementation |
| :--- | :--- | :--- |
| **Frontend** | **Next.js 16 (App Router)** | React 19, Server Components, Tailwind CSS, Lucide Icons, Shadcn UI |
| **Backend API** | **NestJS 10** | TypeScript, Modular Architecture, DTO Validation Pipes, Passport Guards |
| **Database** | **PostgreSQL (Neon)** | Hosted Serverless PostgreSQL relational database |
| **ORM** | **Prisma ORM 7** | Type-safe schema definitions, migrations, and `$transaction` query builder |
| **Cache & Locks** | **Redis 7** | In-memory token revocation, rate limiting, and 15-min stock reservation TTL |
| **Search Engine** | **Meilisearch** | Typo-tolerant full-text search with dynamic multi-facet filtering |
| **Media CDN** | **Cloudinary CDN** | Media asset uploads, thumbnail generation, and image optimization |
| **Notifications**| **Resend** | Transactional email delivery for order receipts and account alerts |
| **Testing** | **Jest & Playwright** | Unit/integration testing and multi-viewport E2E browser automation |
| **Deployment** | **Vercel & Render** | Frontend serverless edge hosting (Vercel) + API web service (Render) |

---

## 📐 5. Modular Monolith Architecture

```text
Next.js 16 Web Application (Frontend)
       │
       ▼  (HTTPS / REST API / JSON)
NestJS 10 REST API Server (Backend Monolith)
       │
       ├── Domain Modules (Auth, Products, Cart, Orders, Inventory, Seller, Admin)
       │
       ▼
Persistence & Infrastructure Layer
 ├── PostgreSQL (Neon Serverless Database via Prisma ORM 7)
 ├── Redis (Token invalidation, rate limiting, stock reservation TTL)
 ├── Meilisearch (Typo-tolerant full-text search engine)
 └── Cloudinary CDN (Image upload & media management)
```

> **Why Modular Monolith?**
> E-commerce operations (cart checkout, stock deduction, order creation) demand single-database ACID transactional atomicity. A Modular Monolith enables single-database `$transaction` blocks in Prisma without complex distributed saga patterns, inter-service network latency, or service-mesh operational overhead.

---

## 📊 6. Verified Project Statistics

- **Catalog Products**: `110` authentic catalog items with high-resolution imagery and ratings
- **Categories**: `8` parent categories & `46` subcategories
- **Authentic Brands**: `46` verified brand entities (Apple, Samsung, Sony, Dell, HP, Nike, Adidas, etc.)
- **User Portals**: `3` dedicated portals (Customer, Seller, Admin)
- **Unit Test Suites**: `3 / 3` passed (`24 / 24` tests)
- **E2E Route Coverage**: `27` routes verified across Desktop & Mobile viewports

---

## 🔑 7. Recruiter Demo Access

Recruiters can explore the live deployment without creating new accounts:

| Portal | URL Path | Demo Credentials | Primary Functionality |
| :--- | :--- | :--- | :--- |
| **Customer Portal** | `/login` | `customer@mykart.test` / `Password123!` | Browse, Wishlist, Cart, Checkout, Orders |
| **Seller Center** | `/login` → `/seller` | `seller@mykart.test` / `Password123!` | Product management, Stock control, Fulfillment |
| **Admin Panel** | `/login` → `/admin` | `admin@mykart.test` / `Password123!` | GMV Analytics, Seller Approvals, User RBAC |

---

## 📐 8. Project Directory Structure

```text
MyKart/
├── apps/
│   ├── web/                # Next.js 16 App Router Frontend
│   │   ├── src/
│   │   │   ├── app/        # Pages, routes & layout hierarchy
│   │   │   ├── components/ # UI, Catalog, Layout & Auth components
│   │   │   ├── contexts/   # React Context state (Cart, Auth)
│   │   │   ├── hooks/      # Custom React hooks
│   │   │   └── lib/        # API client & helper utilities
│   └── api/                # NestJS 10 REST API Backend
│       ├── src/
│       │   ├── common/     # Decorators, Guards, Interceptors, Filters
│       │   ├── database/   # Prisma Service & Client module
│       │   ├── modules/    # Auth, Users, Products, Cart, Orders, Inventory, Seller, Admin
│       │   └── redis/      # Redis Cache & Lock Service
├── docs/                   # Full Technical & Portfolio Documentation Suite
│   ├── ARCHITECTURE.md     # Modular Monolith system architecture & data flows
│   ├── SECURITY.md         # Auth flow, JWT rotation, RBAC & IDOR specifications
│   ├── API.md              # REST API endpoint reference & Swagger guide
│   ├── TESTING.md          # Unit, integration & Playwright E2E testing report
│   ├── DEPLOYMENT.md       # Vercel, Render & Neon production setup guide
│   ├── PROJECT-REPORT.md   # Comprehensive portfolio project report
│   ├── INTERVIEW.md        # Technical interview preparation & architectural trade-offs
│   ├── RESUME.md           # Resume-ready project descriptions (4 versions)
│   ├── GITHUB-PROFILE-README-DRAFT.md # Draft GitHub profile README
│   └── screenshots/        # Visual UI walkthrough guide
├── prisma/                 # PostgreSQL Schema & Migration history
├── .env.example            # Documented environment variable template
├── CONTRIBUTING.md         # Developer setup & PR guidelines
├── LICENSE                 # MIT License
└── package.json            # npm Workspaces root configuration
```

---

## 💻 9. Local Development Setup

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
- **PostgreSQL Database**: Local instance or cloud database (Neon)
- **Redis Server** (optional for local caching)

### Quickstart Guide

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/rudrachandre/Mykart-ecommerce.git
   cd Mykart-ecommerce
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

4. **Run Database Migrations & Catalog Seed**:
   ```bash
   npx prisma db push --schema prisma/schema.prisma
   npx ts-node apps/api/seed-data.ts
   ```

5. **Start Development Servers**:
   ```bash
   # Starts Next.js frontend (3000) and NestJS backend (3001) concurrently
   npm run dev
   ```
   - **Frontend App**: `http://localhost:3000`
   - **Backend API**: `http://localhost:3001`
   - **Swagger OpenAPI Docs**: `http://localhost:3001/api/docs`

---

## 🧪 10. Automated Testing & Verification

```bash
# Run NestJS Backend Unit Tests
npm test -w apps/api

# Run Playwright End-to-End Suite
npx playwright test
```

### Verified QA Results
- **API & Web Build Status**: Clean (`0` errors)
- **Console Runtime Errors**: `0`
- **Broken Images**: `0` (`naturalWidth > 0` across all catalog items)
- **Layout Overflows**: `0` (Verified on 1440x900 Desktop, 390x844 iPhone, 412x915 Pixel viewports)
- **Jest Unit Test Suite**: **Passed** (`24 / 24` tests)
- **Playwright E2E Suite**: **Passed** (`100%` pass rate across 27 routes)

---

## 📚 11. Complete Documentation Navigation

Technical documentation is available in the [`/docs`](./docs) folder:
- 📖 [**Architecture Documentation**](./docs/ARCHITECTURE.md) — Modular monolith design, tier breakdown, and data flows.
- 🔐 [**Security Specification**](./docs/SECURITY.md) — Dual JWT rotation, cookie isolation, RBAC, IDOR defense, and rate limiting.
- 📡 [**API Reference Guide**](./docs/API.md) — REST endpoint specifications, payload models, and Swagger details.
- 🧪 [**Testing Suite Report**](./docs/TESTING.md) — Jest unit coverage, Playwright E2E multi-viewport specifications.
- 💬 [**Interview Preparation Guide**](./docs/INTERVIEW.md) — Technical Q&A, trade-off rationale, and architectural elevator pitches.
- 📄 [**Resume Descriptions**](./docs/RESUME.md) — 4 bulleted versions for resume inclusion.
- 🎓 [**Comprehensive Project Report**](./docs/PROJECT-REPORT.md) — Technical project report detailing design decisions and achievements.
- 🖼️ [**Screenshots Walkthrough**](./docs/screenshots/README.md) — Visual UI screenshot map across key application views.
- 🚀 [**Deployment Guide**](./docs/DEPLOYMENT.md) — Production setup for Vercel, Render, and Neon PostgreSQL.

---

## 📝 12. License & Author

Designed & Built by **Rudraksh Chandresh** as a flagship production-grade e-commerce marketplace.

- **License**: MIT License
- **GitHub**: [@rudrachandre](https://github.com/rudrachandre)
