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

# Redis Cache Connection
REDIS_URL="redis://:<redis_password>@<redis_host>:<redis_port>"

# Meilisearch Connection
MEILISEARCH_HOST="https://<meili_instance_host>"
MEILISEARCH_API_KEY="<your_meili_search_key>"
MEILI_MASTER_KEY="<your_meili_master_key>"

# Authentication Secrets
AUTH_SECRET="<random_32_character_secret_key>"

# Google OAuth 2.0
GOOGLE_CLIENT_ID="<your_google_client_id>.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="<your_google_client_secret>"
GOOGLE_CALLBACK_URL="https://mykart-ecommerce.onrender.com/api/v1/auth/google/callback"

# Cloudinary Storage
CLOUDINARY_CLOUD_NAME="<your_cloudinary_cloud_name>"
CLOUDINARY_API_KEY="<your_cloudinary_api_key>"
CLOUDINARY_API_SECRET="<your_cloudinary_api_secret>"

# Razorpay Payments
RAZORPAY_KEY_ID="<your_razorpay_key_id>"
RAZORPAY_KEY_SECRET="<your_razorpay_key_secret>"
RAZORPAY_WEBHOOK_SECRET="<your_razorpay_webhook_secret>"
```

### Frontend `apps/web/.env`
```env
NEXT_PUBLIC_API_URL="https://mykart-ecommerce.onrender.com/api/v1"
NEXT_PUBLIC_APP_URL="https://mykart-ecommerce-web.vercel.app"
NEXT_PUBLIC_GOOGLE_CLIENT_ID="<your_google_client_id>.apps.googleusercontent.com"
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
