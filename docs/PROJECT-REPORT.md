# MyKart — Production E-Commerce Marketplace Technical Report

---

## 1. Abstract
MyKart is an enterprise-grade multi-vendor e-commerce marketplace built using Next.js 16 (App Router), NestJS 10, PostgreSQL (Neon), Prisma ORM, and Redis. The platform provides a rich online shopping ecosystem for customers while offering dedicated management portals for sellers and system administrators. The system emphasizes transactional consistency, low-latency fuzzy search via Meilisearch, role-based authorization, and modern user interface design.

---

## 2. Problem Statement
Traditional e-commerce web applications often suffer from fragmented architectures, slow search experiences, weak mobile responsiveness, and vulnerable authentication flows. Developing a production-ready marketplace requires balancing complex inventory concurrency, multi-role security (Customer, Seller, Admin), real-time search indexing, and resilient payment gateway integrations without introducing unnecessary microservice operational overhead.

---

## 3. Objectives
- Architect a high-throughput **Modular Monolith** backend using NestJS and Prisma ORM.
- Develop a modern, responsive single-page frontend using Next.js 16 App Router and Tailwind CSS.
- Implement federated **Google OAuth 2.0** alongside credential authentication using dual JWT access/refresh token rotation stored in HttpOnly cookies.
- Build sub-10ms full-text fuzzy search and faceted filter controls powered by Meilisearch.
- Create role-specific operational dashboards for Customer Account Management, Seller Inventory Control, and Admin Marketplace Governance.
- Ensure 100% layout consistency across desktop (1440x900) and mobile (390x844, 412x915) form factors.

---

## 4. Proposed Solution
MyKart addresses these challenges by combining Next.js Server Components with a domain-driven NestJS API. The application uses PostgreSQL for relational data storage, Redis for fast token validation and stock reservation locks, and Meilisearch for real-time product indexing. Role-Based Access Control (RBAC) guards enforce permission boundaries at the API layer, while server-side resource checks prevent Insecure Direct Object References (IDOR).

---

## 5. System Architecture
MyKart uses a tier-separated architecture:
- **Presentation Layer**: Next.js 16 App Router, React 19, Tailwind CSS, Lucide Icons, Shadcn UI.
- **Application Layer**: NestJS 10 REST API, Class-Validator DTOs, Passport Authentication Strategies.
- **Persistence Layer**: Neon Serverless PostgreSQL, Prisma ORM 7.
- **Cache & Infrastructure**: Redis (Rate limiting & reservation TTL), Meilisearch (Fuzzy search engine), Cloudinary (CDN Asset Storage).

---

## 6. Technology Stack
- **Languages**: TypeScript (Strict Mode)
- **Frontend**: Next.js 16, React 19, Tailwind CSS
- **Backend**: NestJS 10, RxJS, Passport
- **Database & Cache**: PostgreSQL 16 (Neon), Prisma 7, Redis 7
- **Search & Services**: Meilisearch, Cloudinary, Razorpay, Resend
- **Testing**: Jest, Playwright

---

## 7. Major Modules
1. **Auth Module**: Registration, Login, Google OAuth, Refresh Token Rotation.
2. **Product Module**: Product catalog CRUD, variant handling, image mapping, rating calculation.
3. **Category & Brand Module**: Hierarchical category tree management and authentic brand registration.
4. **Cart Module**: Persistent user cart, item quantity updates, total calculation.
5. **Checkout & Order Module**: Multi-step checkout, coupon redemption, payment selection (COD/UPI/Card), order state engine.
6. **Inventory Module**: Stock reservation windows, low-stock threshold monitoring, variant stock updates.
7. **Seller Module**: Seller store onboarding, seller product listing, fulfillment updates.
8. **Admin Module**: Executive analytics (GMV, total orders), user management, seller approval controls.

---

## 8. Authentication & Authorization
- **Dual-Token Flow**: 15-minute Bearer Access Tokens for API requests; 7-day HttpOnly, Secure, SameSite refresh token cookies.
- **Argon2 Password Hashing**: Passwords stored using Argon2 cryptographic hashing.
- **RBAC**: `@Roles()` decorator + `PermissionsGuard` enforcing Customer, Seller, and Admin boundaries.

---

## 9. Database Architecture
The database schema (`prisma/schema.prisma`) includes 15 models: `User`, `Account`, `Session`, `Seller`, `Product`, `Category`, `Brand`, `ProductVariant`, `Inventory`, `InventoryTransaction`, `Order`, `OrderItem`, `Review`, `Wishlist`, `Coupon`, `Notification`. Relational foreign keys and indexes guarantee strict data integrity.

---

## 10. Search Architecture
Meilisearch indexes product names, descriptions, category slugs, and brand names in background sync tasks. Search queries execute in <10ms with typo tolerance and dynamic facet matching.

---

## 11. Cart & Checkout Architecture
Cart states persist in local storage for guest sessions and sync seamlessly to database records upon user login. Checkout executes stock check validations before transitioning orders into `PENDING` state.

---

## 12. Inventory Architecture
Inventory is tracked at the variant level (`ProductVariant`). Checkout holds temporary stock reservations backed by Redis key TTL (`INVENTORY_RESERVATION_TTL_MS = 900000`) to prevent overselling during checkout spikes.

---

## 13. Seller System
Sellers gain access to a dedicated dashboard (`/seller`) to manage store metadata, monitor stock counts, fulfill customer orders, create store promotional coupons, and view buyer reviews.

---

## 14. Admin System
Administrators access global marketplace metrics (`/admin`), manage platform users, approve seller onboarding applications, maintain categories and brands, and review administrative audit logs.

---

## 15. Security
- IDOR defense via server-side user ownership checks.
- Rate limiting via `@nestjs/throttler` and Redis.
- Zero committed secrets (enforced via `.gitignore`).
- Parameterized SQL queries via Prisma ORM preventing SQL injection.

---

## 16. Testing
- **Unit Tests**: 24 Jest tests validating core API services and guards.
- **E2E Tests**: Playwright browser suite validating 27 routes across Desktop (1440x900) and Mobile (390x844, 412x915) viewports.

---

## 17. Deployment
- **Frontend**: Vercel Serverless Platform (`https://mykart-ecommerce-web.vercel.app`)
- **Backend API**: Render Web Service (`https://mykart-ecommerce.onrender.com`)
- **Database**: Neon Serverless PostgreSQL

---

## 18. Challenges & Solutions
- *Challenge*: Overlapping range sliders for price & discount filters on mobile viewports.
  *Solution*: Created custom `DualRangeSlider` component using stacked `<input type="range">` elements with CSS highlight clips and 300ms debouncing.
- *Challenge*: Maintaining consistent catalog brand identities across re-seed cycles.
  *Solution*: Synchronized `seed-data.ts` and `admin.service.ts` inline catalog arrays, backed by automated verification scripts.

---

## 19. Results
- **109 Active Products** across **8 Parent Categories** and **46 Authentic Brands**.
- **0 Console Errors**, **0 Broken Images**, **0 Horizontal Overflows**.
- **100% E2E & Unit Test Pass Rate**.

---

## 20. Future Scope
- Integration of Webhooks for real-time payment gateway settlement callbacks.
- AI-driven product recommendation engine based on user browsing history.
- Multi-currency localization support for international buyers.

---

## 21. Conclusion
MyKart demonstrates that modern e-commerce applications can achieve exceptional speed, enterprise security, and seamless developer workflows by combining Next.js 16 Server Components with a NestJS Modular Monolith architecture.
