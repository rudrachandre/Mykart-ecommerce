# MyKart — Resume Portfolio Artifacts

This document contains 3 resume-ready descriptions of the **MyKart** project for software engineering, full-stack, and backend developer resumes.

---

## Version 1: Full-Stack Focused (Recommended)

**MyKart — Full-Stack Multi-Vendor E-Commerce Marketplace**  
*Next.js 16 (App Router), TypeScript, NestJS, PostgreSQL, Prisma ORM, Redis, Meilisearch, Tailwind CSS*
- Architected and built a production-grade multi-vendor e-commerce marketplace supporting **Customer**, **Seller**, and **Admin** portals across **109 active catalog products**, **8 parent categories**, and **46 authentic brands**.
- Implemented federated **Google OAuth 2.0** and email/password authentication using short-lived JWT access tokens and HttpOnly refresh token cookie rotation stored with Argon2 hashing.
- Developed an ultra-fast search and discovery pipeline powered by **Meilisearch** (<10ms fuzzy text search) and dynamic dual-range slider filters for price and discount metrics.
- Engineered automated inventory reservation windows using **Redis TTL locks** to prevent double-booking during high-concurrency checkout flows.
- Established strict security standards with Role-Based Access Control (RBAC), server-side IDOR ownership checks, rate limiting, and zero committed secrets.
- Validated performance and visual stability via **Playwright E2E automation** across 27 routes in Desktop (1440x900) and Mobile (390x844, 412x915) viewports with **0 console errors, 0 broken images, and 0 layout overflows**.

---

## Version 2: Software Engineering & Systems Focused

**MyKart — E-Commerce Systems Engine**  
*NestJS, PostgreSQL (Neon), Prisma ORM, Redis, Jest, Playwright, Vercel, Render*
- Designed a **Modular Monolith** NestJS REST API servicing multi-role marketplace domain modules (Auth, Catalog, Cart, Orders, Inventory, Admin).
- Modeled 15 relational database tables in PostgreSQL via **Prisma ORM**, incorporating transactional integrity (`$transaction`) for order placements and inventory adjustments.
- Engineered an automated unit and integration test suite using **Jest** (**24/24 tests passed**) covering permission guards and inventory transactional operations.
- Deployed a CI/CD pipeline hosting Next.js frontend on **Vercel** and NestJS API on **Render**, backed by serverless **Neon PostgreSQL**.

---

## Version 3: ATS-Friendly Concise Version

**Full-Stack E-Commerce Project | MyKart**  
`Next.js 16 | NestJS | TypeScript | PostgreSQL | Prisma | Redis | Meilisearch | Tailwind CSS`
- Built a multi-vendor e-commerce web application with Customer, Seller, and Admin role workflows.
- Integrated Google OAuth 2.0 and JWT HttpOnly refresh token rotation for secure user authentication.
- Implemented real-time fuzzy search with Meilisearch, dual-range filter sliders, and instant checkout flows.
- Modeled PostgreSQL database schema using Prisma ORM and added Redis in-memory token caching.
- Achieved 100% E2E test pass rate across Desktop and Mobile viewports using Playwright.
