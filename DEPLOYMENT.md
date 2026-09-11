# MyKart Production Deployment Guide

This document outlines the procedure to deploy the MyKart monorepo to production. 
It ensures portability and independence from specific cloud vendors.

## 1. Local Setup vs Production

- **Local Setup**: Relies on Next.js/Turbopack or Webpack (on Windows), NestJS development server (`nest start --watch`), and local `.env` files. 
- **Production Architecture**:
  - **API**: A standalone Node.js process (built via Docker or standard `npm run build -w apps/api`) running on port `3001` (or dynamic `PORT`).
  - **Web Frontend**: A Next.js production server (running on port `3000`) housing both the storefront (`/`) and admin/seller dashboards (`/admin`, `/seller`).

## 2. Deployment Sequence

To avoid race conditions and ensure zero downtime:
1. **Infrastructure**: Provision Database, Redis, and Meilisearch.
2. **Migrations**: Run `npx prisma migrate deploy` on the database.
3. **Backend API**: Deploy the API service and wait for its health check (`/api/v1/health`) to pass.
4. **Frontend**: Deploy the Web application, configured with the live API URL.

## 3. Environment Variables

Ensure `.env.production` is secure and NEVER committed. The `apps/api/.env.example` provides the template.

**Critical Requirements:**
- `DATABASE_URL`: Must point to the production PostgreSQL instance.
- `AUTH_SECRET`: Cryptographically strong random string (≥ 32 characters). The API refuses to start without it.
- `REDIS_URL`: (Optional) Redis instance URL for token revocation, rate limiting, and stock reservation locks (falls back gracefully).
- `MEILISEARCH_HOST` and `MEILISEARCH_API_KEY`: (Optional) Production Meilisearch credentials. If unconfigured, API gracefully falls back to PostgreSQL ILIKE search.
- `NEXT_PUBLIC_API_URL`: Public base URL of the deployed API (required by the storefront at build time).
- `CORS_ORIGIN`: Must be a comma-separated list of exact frontend domains (e.g., `https://mykart-ecommerce-web.vercel.app`).
- `COOKIE_DOMAIN`: (Optional) Domain scope for auth cookies.
- `COOKIE_SAME_SITE`: Set to `lax` or `strict` if on the same root domain. If cross-domain, set to `none`.

## 4. Database & Migrations

**NEVER use `prisma db push` or `prisma migrate reset` in production.**

Production Migration Procedure:
```bash
# In the api directory
npx prisma generate
npx prisma migrate deploy
```

**Backups**: Enable Automated Backups (PITR - Point-in-time Recovery) on your PostgreSQL provider (e.g., NeonDB, RDS).
**Rollback**: Prisma migrations are additive. To roll back an application deployment, revert to the previous container image. To roll back a schema, you must write a down-migration and execute it manually.

## 5. API Deployment & Docker

Deploy the API using the provided multi-stage `Dockerfile`.
- The `Dockerfile` compiles the TypeScript, bundles dependencies cleanly, generates Prisma clients, and runs securely without the development server.
- Exposes port `3001` (or dynamic `PORT`) by default.

## 6. External Services (Redis, Meilisearch, Cloudinary)

- **Redis**: Provides token revocation, rate limiting, and 15-minute stock reservation TTL locks during checkout.
- **Meilisearch**: Used for high-speed typo-tolerant product search with automatic PostgreSQL search fallback when unconfigured.
- **Cloudinary**: Production image uploads use Cloudinary CDN.
- **Simulated Payments**: Multi-method simulated payment checkout (COD, UPI, Card, Netbanking, Wallet) operating without third-party gateway dependencies.

## 7. Security, CORS, and HTTPS

- **HTTPS**: All production traffic MUST terminate at a reverse proxy (e.g., Nginx, Cloudflare, Render) utilizing TLS/SSL.
- **CORS**: Enforced securely by the API using `CORS_ORIGIN`.
- **Cookies**: Set `NODE_ENV=production` to ensure the `Secure` flag is enforced on HTTP-Only tokens.

## 8. Graceful Shutdown & Health Checks

- The NestJS API supports graceful shutdown. Load balancers should send `SIGTERM` and allow existing HTTP requests to complete before terminating the container.
- **Root Health Route**: `GET /` and `HEAD /` return status `{"name": "MyKart API", "status": "ok"}` for load balancer pings.
- **Authoritative Service Health Check**: `GET /api/v1/health` validates PostgreSQL and Redis connections before returning `200 OK`.
- **Fast Startup**: Boot completes in **< 2 seconds** (`ensureAdminUser()` only). Catalog/history seeding is available on-demand via `POST /api/v1/admin/seed-catalog` and `POST /api/v1/admin/seed-history`.
