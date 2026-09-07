# MyKart — Production-Grade Multi-Vendor E-Commerce Marketplace

[![Live Storefront](https://img.shields.io/badge/Frontend-Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://mykart-ecommerce-web.vercel.app)
[![Production API](https://img.shields.io/badge/Backend-Render-46E3B7?style=for-the-badge&logo=render&logoColor=white)](https://mykart-ecommerce.onrender.com)
[![Database](https://img.shields.io/badge/Database-Neon_PostgreSQL-00E599?style=for-the-badge&logo=postgresql&logoColor=white)](https://neon.tech)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Next.js 16](https://img.shields.io/badge/Next.js-16_App_Router-000000?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![NestJS 10](https://img.shields.io/badge/NestJS-10.0-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)](https://nestjs.com/)

**MyKart** is a high-performance, full-stack multi-vendor e-commerce marketplace built as a clean **Modular Monolith** in Next.js 16 and NestJS 10. Designed to deliver an enterprise shopping experience, MyKart features role-based workflows for **Customers**, **Sellers**, and **Admins**, instant fuzzy search via Meilisearch, automated inventory reservation TTLs backed by Redis, dual JWT access/refresh-token rotation with HttpOnly cookie persistence, and full mobile/desktop responsiveness.

---

## 🚀 Live Demo & Production Links

- **Live Storefront (Vercel)**: [https://mykart-ecommerce-web.vercel.app](https://mykart-ecommerce-web.vercel.app)
- **Production REST API (Render)**: [https://mykart-ecommerce.onrender.com](https://mykart-ecommerce.onrender.com)
- **Interactive Swagger Documentation**: [https://mykart-ecommerce.onrender.com/api/docs](https://mykart-ecommerce.onrender.com/api/docs)
- **GitHub Repository**: [https://github.com/rudrachandre/Mykart-ecommerce](https://github.com/rudrachandre/Mykart-ecommerce)

---

## 🎯 1. Project Overview & Catalog Baseline

MyKart delivers an end-to-end e-commerce platform engineered for reliability, security, and developer ergonomics:
- **110 Authentic Catalog Products**: Fully populated product catalog featuring high-resolution images, real-world pricing, discounts, stock levels, and ratings.
- **8 Parent Categories & 40+ Subcategories**: Electronics, Mobiles, Laptops, Fashion, Home & Kitchen, Grocery, Beauty & Personal Care, Sports & Fitness.
- **46 Verified Authentic Brands**: Apple, Samsung, Sony, Dell, HP, Nike, Adidas, Amul, Surf Excel, NCERT, HarperCollins, Pearson, and more.
- **3 Dedicated User Portals**:
  - **Customer Portal**: Instant product discovery, live search filters, dual-range sliders, interactive wishlist, cart manager, multi-step checkout, order tracking, address book, profile settings.
  - **Seller Center (`/seller`)**: Seller store onboarding, product listing, inventory stock controls, order fulfillment status, customer review monitoring, store promotion coupons.
  - **Admin Control Panel (`/admin`)**: Marketplace gross merchandise value (GMV) analytics, user role management, seller verification approvals, category & brand governance, platform audit logs.

---

## 💡 2. Architectural Paradigm: Modular Monolith

> **"Microservices are intentionally not used."**

MyKart is intentionally engineered as a clean **Modular Monolith** rather than distributed microservices:
1. **ACID Transactional Integrity**: E-commerce checkouts demand atomic consistency across Cart, Inventory stock reservation, and Order creation. A modular monolith enables single-database `$transaction` operations in Prisma without complex distributed saga patterns.
2. **Zero Inter-Service Overhead**: Eliminates network latency, gRPC serialization overhead, and service-mesh operational complexity.
3. **Strict Domain Separation**: Backend functionality is isolated into modular domain boundaries (`auth`, `users`, `products`, `cart`, `orders`, `inventory`, `seller`, `admin`, `analytics`, `coupons`, `reviews`, `wishlist`, `notifications`), allowing clean future microservice extraction if hyper-scale demands require it.

---

## 🛠️ 3. Tech Stack

| Layer | Technology | Purpose & Description |
| :--- | :--- | :--- |
| **Frontend** | **Next.js 16 (App Router)** | React 19, Server Components, Tailwind CSS, Lucide Icons, Shadcn UI |
| **Backend API** | **NestJS 10** | TypeScript, Modular Architecture, Class-Validator, Guards, Interceptors |
| **Database** | **PostgreSQL (Neon)** | Hosted Serverless PostgreSQL database |
| **ORM** | **Prisma ORM 7** | Type-safe schema builder, migrations, and transactional queries |
| **Cache & Lock** | **Redis** | In-memory token invalidation, rate limiting, and stock reservation TTL |
| **Search Engine** | **Meilisearch** | Ultra-fast typo-tolerant full-text search with dynamic facet filtering |
| **Media Storage** | **Cloudinary CDN** | Cloud asset uploads, thumbnail generation, and image optimization |
| **Notifications**| **Resend** | Transactional email delivery for order receipts and account alerts |
| **Testing** | **Jest & Playwright** | Unit/integration testing and multi-viewport E2E browser automation |

---

## 🔒 4. Security Architecture

- **Dual-Token Authentication**: Short-lived (15 min) JWT Access Tokens passed via Authorization headers; long-lived (7 day) Refresh Tokens stored in **HttpOnly, Secure, SameSite=Lax/Strict** cookies.
- **Refresh Token Rotation & Reuse Detection**: Upon refreshing, the old refresh token is invalidated. Detecting token reuse triggers immediate token-family revocation to protect user accounts.
- **Server-Side Ownership Validation (IDOR Protection)**: Every sensitive endpoint (order history, user addresses, seller inventory updates) explicitly verifies server-side resource ownership against the caller's JWT payload.
- **Role-Based Access Control (RBAC)**: Custom `@Roles('CUSTOMER', 'SELLER', 'ADMIN')` decorators enforced via NestJS `PermissionsGuard`.
- **Argon2 Password Hashing**: Passwords stored using industry-standard Argon2 cryptographic hashing.
- **Zero Exposed Secrets**: All sensitive keys, API tokens, and database credentials strictly loaded via environment variables and excluded from Git tracking (`.gitignore`).

---

## 📐 5. Project Directory Structure

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
│   └── screenshots/        # Visual UI walkthrough guide
├── prisma/                 # PostgreSQL Schema & Migration history
├── .env.example            # Documented environment variable template
├── CONTRIBUTING.md         # Developer setup & PR guidelines
├── LICENSE                 # MIT License
└── package.json            # npm Workspaces root configuration
```

---

## 💻 6. Local Development Setup

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

## 🧪 7. Testing & Quality Assurance

MyKart is verified by automated backend unit tests and Playwright multi-viewport E2E regression suites:

```bash
# Run NestJS Unit & Integration Test Suites
npm test -w apps/api

# Run Playwright End-to-End Test Suite
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

## 🔑 8. Recruiter Demo Access

Recruiters and hiring managers can explore the live deployment without registering new accounts:

| Portal | URL Path | Demo Credentials | Primary Functionality |
| :--- | :--- | :--- | :--- |
| **Customer Portal** | `/login` | `customer@mykart.test` / `Password123!` | Browse, Wishlist, Cart, Checkout, Orders |
| **Seller Center** | `/login` → `/seller` | `seller@mykart.test` / `Password123!` | Add products, Stock inventory, Fulfill orders |
| **Admin Control Panel** | `/login` → `/admin` | `admin@mykart.test` / `Password123!` | GMV Analytics, Seller Approvals, User RBAC |

---

## 📚 9. Documentation Suite Sitemap

Detailed technical documentation is available in the [`/docs`](./docs) directory:
- 📖 [**Architecture Documentation**](./docs/ARCHITECTURE.md) — Modular monolith design, tier breakdown, and data flow pipelines.
- 🔐 [**Security Specification**](./docs/SECURITY.md) — Dual JWT rotation, cookie isolation, RBAC, IDOR defense, and rate limiting.
- 📡 [**API Reference Guide**](./docs/API.md) — REST endpoint specifications, payload models, and Swagger details.
- 🧪 [**Testing Suite Report**](./docs/TESTING.md) — Jest unit coverage, Playwright E2E multi-viewport specifications.
- 💬 [**Interview Preparation Guide**](./docs/INTERVIEW.md) — Technical Q&A, trade-off rationale, and architectural elevator pitches.
- 📄 [**Resume Descriptions**](./docs/RESUME.md) — 4 bulleted versions for resume inclusion.
- 🎓 [**Comprehensive Project Report**](./docs/PROJECT-REPORT.md) — System report detailing design decisions and achievements.
- 🖼️ [**Screenshots Walkthrough**](./docs/screenshots/README.md) — Visual UI screenshot map across key application views.
- 🚀 [**Deployment Guide**](./docs/DEPLOYMENT.md) — Production setup for Vercel, Render, and Neon PostgreSQL.

---

## 📝 10. License & Author

Designed & Built by **Rudraksh Chandresh** as a production-grade full-stack e-commerce marketplace.

- **License**: MIT License
- **GitHub**: [@rudrachandre](https://github.com/rudrachandre)
