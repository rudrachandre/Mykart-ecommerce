# MyKart — Resume Portfolio Artifacts

This document contains 4 recruiter-ready project descriptions of **MyKart** tailored for resume formats and interview intros.

---

## Version A: One-Line Project Description

> Built and deployed a production-grade full-stack e-commerce marketplace (Next.js 16, NestJS 10, PostgreSQL, Prisma, Redis, Meilisearch) featuring a Modular Monolith architecture, dual JWT auth with HttpOnly cookie rotation, role-based workflows for Customers, Sellers, and Admins, sub-10ms search, and 100% Playwright E2E test coverage across desktop and mobile viewports.

---

## Version B: 2-Line Resume Version

> **MyKart — Full-Stack Multi-Vendor E-Commerce Marketplace** *(Next.js 16, NestJS, TypeScript, PostgreSQL, Prisma, Redis, Meilisearch)*
> Engineered a production-deployed e-commerce marketplace featuring Customer, Seller, and Admin portals across an initial baseline catalog of 110 products, implementing dual JWT refresh-token rotation, RBAC, IDOR protection, Redis stock reservation TTL locks, Meilisearch fuzzy search with PostgreSQL fallback, and automated Playwright E2E testing.

---

## Version C: 3–4 Bullet Resume Version (Recommended for SWE Applications)

**MyKart — Full-Stack Multi-Vendor E-Commerce Marketplace** | `Next.js 16 (App Router) | NestJS 10 | PostgreSQL (Neon) | Prisma ORM | Redis | Meilisearch | TypeScript`
- **Architected a Modular Monolith REST API** servicing Customer, Seller, and Admin portals across an initial baseline catalog of 110 authentic products, 8 parent categories, and 46 brands, avoiding microservice network overhead while ensuring ACID database transactions.
- **Implemented Enterprise Security**: Integrated Google OAuth 2.0 and credential authentication utilizing 15-minute JWT access tokens and 7-day HttpOnly refresh token rotation with token-family reuse detection, server-side IDOR ownership validation, and RBAC guards.
- **Engineered Sub-10ms Search & Inventory Locks**: Integrated Meilisearch for typo-tolerant full-text search with automatic PostgreSQL database fallback and dynamic dual-range slider filters, and implemented Redis TTL locks (`15-min window`) to prevent stock overbooking during checkout.
- **Validated Production Reliability**: Maintained a 100% test pass rate across Jest backend unit tests and automated Playwright E2E multi-viewport regressions (Desktop 1440x900, Mobile 390x844/412x915) with 0 console errors and 0 layout overflows.

---

## Version D: Technical Interview Pitch Version (Elevator Intro)

> "MyKart is a full-stack multi-vendor e-commerce marketplace built using Next.js 16 App Router and NestJS 10. I specifically chose a Modular Monolith architecture to guarantee ACID transactional consistency across cart checkouts and inventory deductions without the complexity and latency of distributed sagas. The platform features secure dual-token JWT authentication with HttpOnly cookie rotation, server-side IDOR protection, role-based controls for Customers, Sellers, and Admins, sub-10ms Meilisearch fuzzy search (backed by PostgreSQL fallback), Redis TTL stock reservation locks, and complete Playwright E2E browser automation across desktop and mobile form factors."
