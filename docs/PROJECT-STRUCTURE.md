# MyKart — Repository & Workspace Structure

MyKart is organized as a monorepo utilizing **npm Workspaces** and **Turborepo** for build orchestration.

---

## 📂 Repository Directory Tree

```text
MyKart/
├── .env.example                # Root environment variables template (placeholders only)
├── .gitignore                  # Git tracking exclusion rules
├── README.md                   # Primary project documentation
├── package.json                # Workspaces definition & root scripts
├── turbo.json                  # Turborepo task pipeline configuration
├── docker-compose.yml          # Local infrastructure orchestration (Redis/Postgres/Meilisearch)
├── prisma.config.ts            # Prisma schema configuration
│
├── apps/
│   ├── web/                    # Next.js 16 App Router Frontend
│   │   ├── src/
│   │   │   ├── app/            # App Router pages (/products, /cart, /checkout, /seller, /admin)
│   │   │   ├── components/     # React Components
│   │   │   │   ├── auth/       # Auth modals & Google OAuth buttons
│   │   │   │   ├── catalog/    # FilterSidebar, DualRangeSlider, ProductCard, SearchBar
│   │   │   │   ├── checkout/   # COD/UPI/Card payment forms
│   │   │   │   ├── layout/     # Navbar, Footer, CategoryDrawer
│   │   │   │   └── ui/         # Shadcn base UI components
│   │   │   ├── hooks/          # Custom hooks (useAuth, useCart, useWishlist)
│   │   │   └── lib/            # API Client, utils, constants
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── api/                    # NestJS 10 REST API Server
│   │   ├── src/
│   │   │   ├── main.ts         # Application bootstrap & Swagger initialization
│   │   │   ├── app.module.ts   # Root module importing feature modules
│   │   │   ├── common/         # Decorators, Guards, Interceptors, Filters
│   │   │   ├── database/       # Prisma Service & Client instantiation
│   │   │   ├── redis/          # Redis Cache Module
│   │   │   ├── seed-data.ts    # Seed script for 109 catalog items & 46 brands
│   │   │   └── modules/        # Domain Feature Modules
│   │   │       ├── auth/       # Google OAuth & Local JWT Auth
│   │   │       ├── users/      # User management & RBAC
│   │   │       ├── products/   # Catalog CRUD & Search indexing
│   │   │       ├── categories/ # Category management
│   │   │       ├── brands/     # Authentic brand management
│   │   │       ├── cart/       # Customer cart logic
│   │   │       ├── orders/     # Order placement & state machine
│   │   │       ├── inventory/  # Stock reservation & low-stock alerts
│   │   │       ├── seller/     # Seller dashboard services
│   │   │       └── admin/      # Admin dashboard services & metrics
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── admin/                  # [LEGACY / OPTIONAL] Historical standalone admin package
│                               # Note: Active Admin Portal is fully integrated into apps/web/src/app/admin
│
├── docs/                       # Official System Documentation Suite
│   ├── ARCHITECTURE.md         # System design & Modular Monolith rationale
│   ├── FEATURES.md             # Complete feature breakdown by role
│   ├── SECURITY.md             # Security model, JWT rotation & RBAC
│   ├── TESTING.md              # E2E Playwright & Jest unit test reports
│   ├── DEPLOYMENT.md           # Vercel, Render, & Neon setup guide
│   ├── PROJECT-STRUCTURE.md    # Repository workspace guide
│   ├── PROJECT-REPORT.md       # Comprehensive academic/portfolio report
│   ├── RESUME.md               # Resume-ready project descriptions
│   ├── API.md                  # REST API & Swagger specifications
│   └── screenshots/            # UI screenshots & visual walkthroughs
│
├── packages/                   # Shared TypeScript configurations & definitions
│   └── eslint-config/          # Shared ESLint rules
│
└── prisma/                     # Database Schema & Migration files
    └── schema.prisma           # Prisma Data Models & Enums
```

---

## 📌 Workspace Package Status

1. **`apps/web`**: **ACTIVE** — Primary Next.js 16 customer, seller, and admin frontend application.
2. **`apps/api`**: **ACTIVE** — Primary NestJS 10 REST API backend server.
3. **`apps/admin`**: **LEGACY / INACTIVE** — Early prototype directory. All admin dashboard functionality is fully unified inside `apps/web/src/app/admin` for seamless navigation and single-domain deployment.
