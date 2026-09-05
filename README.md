# MyKart — Premium Full-Stack E-Commerce Marketplace

[![Deploy with Vercel](https://img.shields.io/badge/Frontend-Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://mykart-ecommerce-web.vercel.app)
[![Backend Render](https://img.shields.io/badge/Backend-Render-46E3B7?style=for-the-badge&logo=render&logoColor=white)](https://mykart-ecommerce.onrender.com)
[![PostgreSQL Neon](https://img.shields.io/badge/Database-Neon_PostgreSQL-00E599?style=for-the-badge&logo=postgresql&logoColor=white)](https://neon.tech)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Next.js 16](https://img.shields.io/badge/Next.js-16_App_Router-000000?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![NestJS](https://img.shields.io/badge/NestJS-10.0-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)](https://nestjs.com/)

MyKart is a high-performance, production-grade multi-vendor e-commerce marketplace built using modern web architecture. It provides an Amazon/Flipkart-tier shopping experience featuring role-based workflows for **Customers**, **Sellers**, and **Admins**, instant fuzzy search via Meilisearch, automated inventory reservation, secure multi-factor authentication (Google OAuth 2.0 & JWT Refresh-Token rotation), and full mobile/desktop responsiveness.

---

## 🚀 Live Demo & Links

- **Live Storefront (Vercel)**: [https://mykart-ecommerce-web.vercel.app](https://mykart-ecommerce-web.vercel.app)
- **Production API Server (Render)**: [https://mykart-ecommerce.onrender.com](https://mykart-ecommerce.onrender.com)
- **GitHub Repository**: [https://github.com/rudrachandre/Mykart-ecommerce](https://github.com/rudrachandre/Mykart-ecommerce)
- **API Documentation (Swagger)**: [https://mykart-ecommerce.onrender.com/api/docs](https://mykart-ecommerce.onrender.com/api/docs)

---

## 🎯 1. Project Overview

MyKart delivers an end-to-end e-commerce solution engineered for reliability, security, and developer ergonomics:
- **109 Authentic Catalog Products** with high-resolution imagery, consistent real-world pricing, discounts, and ratings.
- **8 Parent Categories & 40+ Subcategories**: Electronics, Mobiles, Laptops, Fashion, Home & Kitchen, Grocery, Beauty & Personal Care, Sports & Fitness.
- **46 Verified Authentic Brands**: Apple, Samsung, Sony, Dell, HP, Nike, Adidas, Amul, Surf Excel, NCERT, HarperCollins, Pearson, etc.
- **3 Dedicated User Portals**:
  - **Customer Portal**: Instant discovery, search filters, dual-range sliders, interactive wishlist, cart, multi-step checkout, order tracking, address book, profile management.
  - **Seller Center**: Product listing, inventory stock controls, order fulfillment management, reviews, promotional coupon manager, payout analytics.
  - **Admin Control Panel**: Marketplace analytics, global user management, seller verification, category & brand management, global audit logs.

---

## 💡 2. Project Vision

Built as a production benchmark application showcasing high quality engineering principles:
- **Zero Microservice Overhead**: Built as a cleanly structured **Modular Monolith** in NestJS and Next.js 16 to maximize performance, deployment efficiency, and domain cohesion without complex distributed orchestration.
- **Enterprise Security First**: Access token rotation, HttpOnly cookie persistence, Argon2 password hashing, RBAC guards, and IDOR protection.
- **Complete Test Coverage**: Verified by 24 unit test suites and comprehensive end-to-end Playwright tests across desktop (1440x900) and mobile (390x844, 412x915) viewports.

---

## 🛠️ 3. Tech Stack & Architecture

| Layer | Technology | Description |
| :--- | :--- | :--- |
| **Frontend** | **Next.js 16 (App Router)** | React 19, Server Components, Tailwind CSS, Lucide Icons, Shadcn UI |
| **Backend API** | **NestJS 10** | TypeScript, Modular Architecture, Class-Validator, Guards, Interceptors |
| **Database** | **PostgreSQL (Neon)** | Hosted Serverless PostgreSQL database |
| **ORM** | **Prisma ORM 7** | Type-safe query builder and database migration engine |
| **Caching & Queue** | **Redis** | In-memory token caching, rate limiting, and stock reservation TTL |
| **Search Engine** | **Meilisearch** | Ultra-fast typo-tolerant full-text search with facet filtering |
| **Payment Gateway** | **Razorpay** | Secured payment gateway integration + COD & UPI UI |
| **Media Storage** | **Cloudinary** | Optimized CDN image uploads and transformations |
| **Email Service** | **Resend** | Transactional email notifications for orders and account alerts |
| **Testing** | **Jest & Playwright** | Unit, integration, and E2E multi-viewport browser testing |

---

## 🔥 4. Key Functional Features

### 🛒 Customer Features
- **Google OAuth 2.0 & Email/Password Auth**: Instant sign-in with Google or credentials with secure session storage.
- **Advanced Search & Discovery**: Typo-tolerant live search, autocomplete suggestions, dual-range price & discount sliders, brand checkboxes, rating filters.
- **Cart & Checkout**: Real-time quantity updates, price breakdown, coupon application, address selector, COD/UPI/Card payment UI.
- **Customer Account Suite**: Order history, order status timeline, wishlist toggle, address manager, notification alerts, profile settings.

### 🏭 Seller Features
- **Seller Onboarding**: Instant registration to start selling.
- **Product & Stock Management**: Add/edit catalog items, upload images, manage variants, and set low-stock thresholds.
- **Order Processing**: View pending orders, update fulfillment status (Processing, Shipped, Delivered).
- **Coupon Manager**: Create percentage or fixed-amount discount coupons.

### 🛡️ Admin Features
- **Executive Analytics Dashboard**: Marketplace gross merchandise value (GMV), total orders, active users, seller revenue metrics.
- **User & Seller Governance**: Role assignments, seller verification approvals, account status controls.
- **Catalog Governance**: Create and manage parent/sub-categories and authentic brand definitions.

---

## 🔒 5. Security & Protection

MyKart enforces strict production security practices:
1. **JWT & HttpOnly Cookie Architecture**: Access tokens are kept short-lived (15 min) in memory/header, while refresh tokens are stored in HttpOnly, SameSite, Secure cookies.
2. **Server-Side Ownership Validation (IDOR Protection)**: Every sensitive operation (updating orders, accessing addresses, updating products) explicitly validates that the authenticated user owns the resource or holds Admin privileges.
3. **Role-Based Access Control (RBAC)**: Custom NestJS `@Roles()` decorators and `PermissionsGuard` protect routes at the API layer.
4. **Input Sanitization**: Strict DTO validation using `class-validator` and `zod`.
5. **Zero Committed Secrets**: All credentials and API keys are loaded via environment variables; `.gitignore` strictly prevents key leakage.

---

## 📐 6. Project Structure

```text
MyKart/
├── apps/
│   ├── web/                # Next.js 16 App Router Frontend
│   │   ├── src/
│   │   │   ├── app/        # App Router Pages & API routes
│   │   │   ├── components/ # React Components (UI, Catalog, Layout, Auth)
│   │   │   ├── hooks/      # Custom React Hooks
│   │   │   └── lib/        # Utility Functions & API Client
│   └── api/                # NestJS REST API Server
│       ├── src/
│       │   ├── common/     # Decorators, Guards, Interceptors, Filters
│       │   ├── database/   # Prisma Service & Client
│       │   ├── modules/    # Auth, Users, Products, Orders, Cart, Wishlist, Admin, Seller
│       │   └── redis/      # Redis Cache Service
├── docs/                   # Full Architecture, Feature, Testing, & Deployment Documentation
│   ├── ARCHITECTURE.md
│   ├── FEATURES.md
│   ├── SECURITY.md
│   ├── TESTING.md
│   ├── DEPLOYMENT.md
│   ├── PROJECT-STRUCTURE.md
│   ├── PROJECT-REPORT.md
│   ├── RESUME.md
│   ├── API.md
│   └── screenshots/
├── packages/               # Shared TS definitions & ESLint configurations
├── prisma/                 # Database Schema & Migration files
│   └── schema.prisma
├── package.json            # npm Workspaces configuration
└── README.md
```

---

## 💻 7. Local Development Setup

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
- **PostgreSQL Database**: Local or Cloud (Neon)
- **Redis Server** (optional for local caching)

### Installation Steps

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
   Copy `.env.example` to `.env` in the root directory, `apps/api/.env`, and `apps/web/.env`:
   ```bash
   cp .env.example .env
   ```

4. **Run Database Migrations & Seed**:
   ```bash
   npx prisma db push --schema prisma/schema.prisma
   npx ts-node apps/api/seed-data.ts
   ```

5. **Start Development Servers**:
   ```bash
   npm run dev
   ```
   - **Frontend**: `http://localhost:3000`
   - **Backend API**: `http://localhost:3001`
   - **Swagger Docs**: `http://localhost:3001/api/docs`

---

## 🧪 8. Testing & Quality Assurance

MyKart undergoes strict automated testing to guarantee zero regressions:

```bash
# Run NestJS Unit & Integration Tests
npm test -w apps/api

# Run Production E2E Playwright Suite
npx playwright test
```

### Verified QA Results
- **Console Errors**: `0`
- **Failed Network Requests**: `0`
- **Broken Images**: `0`
- **Horizontal Overflows**: `0` (Tested on 1440x900 Desktop, 390x844 iPhone, 412x915 Pixel viewports)
- **Unit Test Suite**: **24/24 Passed**

---

## 📚 9. Complete Documentation Suite

Detailed technical documentation is available in the [`/docs`](./docs) folder:
- 📖 [**Architecture Guide**](./docs/ARCHITECTURE.md) — System flow, Modular Monolith rationale, and service breakdown.
- 🎯 [**Feature Matrix**](./docs/FEATURES.md) — Detailed list of Customer, Seller, and Admin features.
- 🔐 [**Security Model**](./docs/SECURITY.md) — Authentication, JWT token rotation, RBAC, and IDOR prevention.
- 🧪 [**Testing Specification**](./docs/TESTING.md) — E2E test coverage metrics, Playwright configuration, and test reports.
- 🚀 [**Deployment Guide**](./docs/DEPLOYMENT.md) — Vercel, Render, and Neon configuration instructions.
- 📂 [**Project Structure**](./docs/PROJECT-STRUCTURE.md) — Detailed workspace directory breakdown.
- 🎓 [**Academic / Portfolio Report**](./docs/PROJECT-REPORT.md) — Comprehensive project report for presentation.
- 📄 [**Resume Portfolio Artifact**](./docs/RESUME.md) — 3 resume-ready descriptions of the project.
- 📡 [**API Specification**](./docs/API.md) — REST API endpoints, Swagger documentation, and payload models.

---

## 📝 10. License & Author

Designed & Developed by **Rudraksh Chandresh** as a flagship production e-commerce platform.

- **License**: MIT License
- **GitHub**: [@rudrachandre](https://github.com/rudrachandre)
