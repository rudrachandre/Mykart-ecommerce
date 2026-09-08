# MyKart — Deployment Architecture & Environment Guide

MyKart is deployed across serverless and cloud hosting infrastructure to provide high availability and fast performance.

---

## 🌐 1. Live Deployment Infrastructure

| Service Layer | Cloud Provider | Deployment URL |
| :--- | :--- | :--- |
| **Frontend Web Application** | **Vercel** | [https://mykart-ecommerce-web.vercel.app](https://mykart-ecommerce-web.vercel.app) |
| **Backend REST API** | **Render** | [https://mykart-ecommerce.onrender.com](https://mykart-ecommerce.onrender.com) |
| **Database** | **Neon PostgreSQL** | Serverless PostgreSQL Cluster |
| **Search Engine** | **Meilisearch Cloud** | Hosted Meilisearch Cluster |
| **Asset Storage** | **Cloudinary** | Global CDN |

---

## 🔑 2. Environment Variables Reference

Below is the complete template of required environment variables using **placeholders only**. Never commit real API keys or passwords to version control.

### Root / Backend `.env`
```env
# Application Settings
NODE_ENV="production"
PORT=3001
CORS_ORIGIN="https://mykart-ecommerce-web.vercel.app"

# Database Connection (Neon PostgreSQL)
DATABASE_URL="postgresql://<db_user>:<db_password>@<db_host>.neon.tech/<db_name>?sslmode=require"

# Redis Cache Connection (Optional - falls back gracefully)
REDIS_URL="redis://:<redis_password>@<redis_host>:<redis_port>"

# Meilisearch Connection (Optional - falls back to PostgreSQL ILIKE search if unconfigured)
MEILISEARCH_HOST="https://<meili_instance_host>"
MEILISEARCH_API_KEY="<your_meili_search_key>"
MEILI_MASTER_KEY="<your_meili_master_key>"

# Authentication Secrets
AUTH_SECRET="<random_32_character_secret_key>"

# Cloudinary Storage
CLOUDINARY_CLOUD_NAME="<your_cloudinary_cloud_name>"
CLOUDINARY_API_KEY="<your_cloudinary_api_key>"
CLOUDINARY_API_SECRET="<your_cloudinary_api_secret>"
```

### Frontend `apps/web/.env`
```env
NEXT_PUBLIC_API_URL="https://mykart-ecommerce.onrender.com/api/v1"
NEXT_PUBLIC_APP_URL="https://mykart-ecommerce-web.vercel.app"
```

---

## 🚀 3. Continuous Deployment & Build Pipeline

1. **Frontend Deployment (Vercel)**:
   - Root Directory: `apps/web`
   - Build Command: `npm run build -w apps/web`
   - Output Directory: `.next`

2. **Backend Deployment (Render)**:
   - Root Directory: `apps/api`
   - Build Command: `npm run build -w apps/api`
   - Start Command: `node dist/main.js`

---

## ⚡ 4. Cold Start & Health Monitoring

### Cold Start Notice
The backend service is hosted on Render's free web service tier. On inactivity, Render spins down free instances. The first incoming request after an idle period may experience a short cold start while the instance spins up; subsequent requests respond at normal latency.
*(Note: The NestJS application boot time itself is **< 2 seconds**, as automatic database re-seeding on startup has been removed in favor of fast, idempotent boot).*

### Health Check Endpoints
- **Root Status Ping**: `GET /` and `HEAD /` return status `{"name": "MyKart API", "status": "ok"}` for load balancer / platform health probes.
- **Authoritative Service Health Check**: `GET /api/v1/health` performs live database (PostgreSQL) and Redis connectivity checks and returns overall service health status.

### Startup Seeding Behavior
- `seedCatalog` and `seedHistory` are **NOT** automatically executed during application startup.
- Production startup performs fast, idempotent admin account verification (`ensureAdminUser()`) in < 2 seconds.
- Catalog and history seeding remain available on-demand via protected admin API endpoints (`POST /api/v1/admin/seed-catalog` and `POST /api/v1/admin/seed-history`).
