# NEXORA --- Premium Full-Stack E-Commerce Marketplace

## 1. Project Vision

Build a production-grade, scalable e-commerce marketplace inspired by:

-   Amazon: marketplace functionality, search, cart, checkout, orders,
    sellers
-   Google/Material-style design: clean, structured, minimal UI
-   Apple-style product presentation: premium visuals and smooth,
    purposeful transitions

Do not clone Amazon, Google, or Apple. Use them only as UX and visual
inspiration. The final product must have its own brand identity.

Primary goals:

1.  Production-quality architecture
2.  Responsive UI
3.  Excellent UX
4.  Fast performance
5.  Smooth animations
6.  Secure authentication
7.  Scalable backend
8.  Clean reusable code
9.  SEO-friendly product pages
10. Portfolio-quality implementation

------------------------------------------------------------------------

## 2. Core User Types

### Customer

-   Register/login
-   Browse products
-   Search products
-   Filter and sort products
-   View product details
-   Select variants
-   Add/remove cart items
-   Wishlist
-   Checkout
-   Manage addresses
-   Make payments
-   Track orders
-   Review products
-   View order history
-   Manage profile

### Seller

-   Seller registration
-   Seller dashboard
-   Add/edit/delete products
-   Manage inventory
-   Manage orders
-   View revenue
-   View analytics
-   Manage discounts
-   View reviews

### Admin

-   Admin dashboard
-   Manage users
-   Manage sellers
-   Manage products
-   Manage categories
-   Manage orders
-   Manage payments
-   Manage reviews
-   Manage coupons
-   Manage inventory
-   View analytics
-   Platform configuration

------------------------------------------------------------------------

## 3. Technology Stack

### Frontend

-   Next.js
-   React
-   TypeScript
-   Tailwind CSS
-   Motion / Framer Motion
-   shadcn/ui
-   React Hook Form
-   Zod
-   TanStack Query
-   Zustand

### Backend

-   Node.js
-   NestJS
-   TypeScript
-   REST API
-   Swagger/OpenAPI

### Database

-   PostgreSQL
-   Prisma ORM

### Infrastructure

-   Redis
-   Meilisearch initially
-   Cloudinary initially
-   S3-compatible storage abstraction
-   Resend for email
-   Razorpay for Indian payments
-   Stripe-ready payment abstraction for international payments

### Testing

-   Vitest
-   Jest where appropriate for NestJS
-   React Testing Library
-   Playwright

### Deployment

-   Frontend: Vercel
-   Backend: Railway / Render / AWS
-   Managed PostgreSQL
-   Upstash / Redis Cloud
-   Meilisearch Cloud or self-hosted
-   GitHub Actions
-   Sentry

------------------------------------------------------------------------

## 4. High-Level System Architecture

``` text
                         USERS
                           |
                           v
                  +----------------+
                  |    Next.js     |
                  |    Frontend    |
                  +-------+--------+
                          |
                     HTTPS / API
                          |
                          v
                  +----------------+
                  |   NestJS API   |
                  |    Backend     |
                  +-------+--------+
                          |
          +---------------+----------------+
          |               |                |
          v               v                v
   +-------------+ +-------------+ +-------------+
   | PostgreSQL  | |    Redis    | | Meilisearch |
   |   Database  | | Cache/Jobs  | |   Search    |
   +-------------+ +-------------+ +-------------+
          |
   +------+------+------+
   |             |      |
   v             v      v
Payments      Cloudinary Resend
Razorpay      Images     Email
```

Use a modular monolith initially. Do not introduce microservices unless
actual scaling requirements justify them.

------------------------------------------------------------------------

## 5. Monorepo Structure

``` text
nexora/
│
├── apps/
│   ├── web/
│   │   ├── app/
│   │   ├── components/
│   │   ├── features/
│   │   ├── hooks/
│   │   ├── lib/
│   │   ├── services/
│   │   ├── store/
│   │   ├── types/
│   │   ├── utils/
│   │   └── styles/
│   │
│   ├── api/
│   │   └── src/
│   │       ├── modules/
│   │       ├── common/
│   │       ├── config/
│   │       ├── database/
│   │       ├── guards/
│   │       ├── interceptors/
│   │       ├── middleware/
│   │       └── main.ts
│   │
│   └── admin/
│       ├── app/
│       ├── components/
│       ├── features/
│       └── lib/
│
├── packages/
│   ├── ui/
│   ├── types/
│   ├── validation/
│   ├── config/
│   └── utils/
│
├── prisma/
│   ├── schema.prisma
│   ├── seed.ts
│   └── migrations/
│
├── docs/
│   ├── architecture.md
│   ├── api.md
│   ├── database.md
│   └── deployment.md
│
├── tests/
│   ├── e2e/
│   └── integration/
│
├── .env.example
├── docker-compose.yml
├── package.json
├── turbo.json
├── README.md
└── .gitignore
```

------------------------------------------------------------------------

## 6. Frontend Architecture

``` text
apps/web/

app/
├── (store)/
│   ├── page.tsx
│   ├── products/
│   │   ├── page.tsx
│   │   └── [slug]/
│   │       └── page.tsx
│   ├── category/
│   │   └── [slug]/
│   │       └── page.tsx
│   ├── search/
│   │   └── page.tsx
│   ├── cart/
│   │   └── page.tsx
│   ├── wishlist/
│   │   └── page.tsx
│   ├── checkout/
│   │   ├── page.tsx
│   │   ├── address/
│   │   ├── payment/
│   │   └── success/
│   ├── orders/
│   │   ├── page.tsx
│   │   └── [id]/
│   └── account/
│       ├── page.tsx
│       ├── profile/
│       ├── addresses/
│       └── security/
│
├── (auth)/
│   ├── login/
│   ├── register/
│   ├── forgot-password/
│   └── reset-password/
│
├── layout.tsx
├── loading.tsx
├── error.tsx
├── not-found.tsx
└── globals.css
```

------------------------------------------------------------------------

## 7. Frontend Component Architecture

``` text
components/

ui/
├── Button
├── Input
├── Dialog
├── Drawer
├── Dropdown
├── Modal
├── Tabs
├── Badge
├── Skeleton
├── Tooltip
└── Toast

navigation/
├── Navbar
├── SearchBar
├── UserMenu
├── CartButton
└── MobileNavigation

product/
├── ProductCard
├── ProductGrid
├── ProductGallery
├── ProductInfo
├── ProductPrice
├── ProductRating
├── ProductReviews
├── ProductVariantSelector
├── ProductActions
└── ProductRecommendations

cart/
├── CartItem
├── CartSummary
├── CartDrawer
└── QuantitySelector

checkout/
├── CheckoutForm
├── AddressSelector
├── PaymentSelector
└── OrderSummary

home/
├── HeroSection
├── CategorySection
├── FeaturedProducts
├── TrendingProducts
├── RecommendationSection
└── PromotionalBanner

animations/
├── PageTransition
├── FadeIn
├── SlideIn
├── ScaleIn
├── StaggerContainer
└── SharedElement
```

------------------------------------------------------------------------

## 8. Feature-Based Frontend Architecture

``` text
features/

auth/
├── components/
├── hooks/
├── services/
├── schemas/
└── types/

products/
├── components/
├── hooks/
├── services/
├── schemas/
└── types/

cart/
├── components/
├── hooks/
├── services/
├── store/
└── types/

checkout/
├── components/
├── hooks/
├── services/
└── schemas/

orders/
├── components/
├── hooks/
├── services/
└── types/

wishlist/
search/
reviews/
payments/
profile/
```

Keep business logic out of UI components. API calls should live in
service/query layers.

------------------------------------------------------------------------

## 9. Backend Module Architecture

``` text
apps/api/src/modules/

auth/
users/
products/
categories/
brands/
sellers/
inventory/
cart/
wishlist/
orders/
payments/
reviews/
coupons/
search/
notifications/
analytics/
admin/
```

Every module should follow:

``` text
module/
├── controller.ts
├── service.ts
├── repository.ts
├── dto/
├── entities/
├── guards/
├── interfaces/
├── tests/
└── module.ts
```

------------------------------------------------------------------------

## 10. Database Entities

### User

-   id
-   name
-   email
-   passwordHash
-   role
-   avatar
-   emailVerified
-   createdAt
-   updatedAt

### Address

-   id
-   userId
-   fullName
-   phone
-   addressLine1
-   addressLine2
-   city
-   state
-   postalCode
-   country
-   isDefault

### Category

-   id
-   name
-   slug
-   description
-   image
-   parentId

### Brand

-   id
-   name
-   slug
-   logo

### Seller

-   id
-   userId
-   storeName
-   slug
-   description
-   logo
-   status
-   commissionRate

### Product

-   id
-   sellerId
-   categoryId
-   brandId
-   name
-   slug
-   description
-   basePrice
-   salePrice
-   status
-   averageRating
-   reviewCount
-   createdAt
-   updatedAt

### ProductImage

-   id
-   productId
-   url
-   alt
-   sortOrder

### ProductVariant

-   id
-   productId
-   sku
-   color
-   size
-   price
-   stock

### Inventory

-   id
-   variantId
-   quantity
-   reserved
-   updatedAt

### Cart

-   id
-   userId
-   updatedAt

### CartItem

-   id
-   cartId
-   productId
-   variantId
-   quantity
-   price

### Wishlist

-   id
-   userId

### WishlistItem

-   id
-   wishlistId
-   productId

### Order

-   id
-   userId
-   status
-   subtotal
-   discount
-   shippingFee
-   tax
-   total
-   shippingAddress
-   createdAt

### OrderItem

-   id
-   orderId
-   productId
-   sellerId
-   variantId
-   quantity
-   price

### Payment

-   id
-   orderId
-   provider
-   transactionId
-   amount
-   currency
-   status

### Review

-   id
-   userId
-   productId
-   rating
-   title
-   comment
-   verifiedPurchase
-   createdAt

### Coupon

-   id
-   code
-   type
-   value
-   minimumOrder
-   maximumDiscount
-   startDate
-   expiryDate
-   usageLimit
-   active

### Notification

-   id
-   userId
-   type
-   title
-   message
-   read
-   createdAt

------------------------------------------------------------------------

## 11. Database Relationships

``` text
USER
 |
 +---- ADDRESS
 |
 +---- CART
 |       |
 |       +---- CART_ITEM ---- PRODUCT
 |
 +---- WISHLIST
 |       |
 |       +---- WISHLIST_ITEM ---- PRODUCT
 |
 +---- ORDER
 |       |
 |       +---- ORDER_ITEM ---- PRODUCT
 |
 +---- REVIEW ---- PRODUCT
 |
 +---- SELLER
          |
          +---- PRODUCT
                    |
                    +---- CATEGORY
                    +---- BRAND
                    +---- PRODUCT_IMAGE
                    +---- PRODUCT_VARIANT
                              |
                              +---- INVENTORY
```

Use indexes on frequently queried fields such as:

-   users.email
-   products.slug
-   products.categoryId
-   products.sellerId
-   products.brandId
-   orders.userId
-   orders.status
-   cart.userId
-   reviews.productId

Use transactions for inventory, order, and payment-related operations.

------------------------------------------------------------------------

## 12. API Architecture

Base URL:

``` text
/api/v1
```

### Authentication

``` text
POST   /auth/register
POST   /auth/login
POST   /auth/logout
POST   /auth/refresh
POST   /auth/forgot-password
POST   /auth/reset-password
GET    /auth/me
GET    /auth/google
```

### Users

``` text
GET    /users/me
PATCH  /users/me
DELETE /users/me
```

### Products

``` text
GET    /products
GET    /products/:id
GET    /products/slug/:slug
POST   /products
PATCH  /products/:id
DELETE /products/:id
```

### Categories

``` text
GET    /categories
GET    /categories/:slug
```

### Search

``` text
GET    /search
GET    /search/suggestions
```

### Cart

``` text
GET    /cart
POST   /cart/items
PATCH  /cart/items/:id
DELETE /cart/items/:id
DELETE /cart
```

### Wishlist

``` text
GET    /wishlist
POST   /wishlist/:productId
DELETE /wishlist/:productId
```

### Orders

``` text
POST   /orders
GET    /orders
GET    /orders/:id
PATCH  /orders/:id/cancel
```

### Payments

``` text
POST   /payments/create
POST   /payments/verify
POST   /payments/webhook
```

### Reviews

``` text
GET    /products/:id/reviews
POST   /products/:id/reviews
PATCH  /reviews/:id
DELETE /reviews/:id
```

### Coupons

``` text
POST   /coupons/validate
```

### Sellers

``` text
POST   /sellers
GET    /sellers/dashboard
GET    /sellers/orders
GET    /sellers/products
```

### Admin

``` text
GET    /admin/dashboard
GET    /admin/users
GET    /admin/sellers
GET    /admin/products
GET    /admin/orders
GET    /admin/analytics
```

------------------------------------------------------------------------

## 13. Search System

Use Meilisearch initially.

Support:

-   Full-text search
-   Typo tolerance
-   Autocomplete
-   Product suggestions
-   Category filters
-   Brand filters
-   Price filters
-   Rating filters
-   Availability filters
-   Sorting
-   Pagination

Flow:

``` text
SearchBar
   ↓
Search API
   ↓
Meilisearch
   ↓
Search results
   ↓
Product cards
```

------------------------------------------------------------------------

## 14. Cart System

Cart must support:

-   Add product
-   Remove product
-   Increase/decrease quantity
-   Variant selection
-   Stock validation
-   Price validation
-   Coupon
-   Tax
-   Shipping
-   Subtotal
-   Grand total

Never trust price values sent by the frontend.

Backend must retrieve current pricing from the database.

Flow:

``` text
Frontend
   ↓
POST /cart/items
   ↓
Check product
   ↓
Check variant
   ↓
Check inventory
   ↓
Get server-side price
   ↓
Update cart
   ↓
Return updated cart
```

------------------------------------------------------------------------

## 15. Checkout Architecture

Checkout steps:

1.  Cart verification
2.  Address selection
3.  Shipping calculation
4.  Coupon validation
5.  Tax calculation
6.  Order preview
7.  Payment
8.  Payment verification
9.  Order creation
10. Inventory deduction
11. Confirmation email

Flow:

``` text
CART
 ↓
CHECKOUT
 ↓
ADDRESS
 ↓
SHIPPING
 ↓
COUPON
 ↓
ORDER SUMMARY
 ↓
PAYMENT
 ↓
PAYMENT WEBHOOK
 ↓
ORDER CONFIRMED
```

------------------------------------------------------------------------

## 16. Payment Security

Never mark an order as paid based only on a frontend response.

Correct flow:

``` text
Frontend
 ↓
Create payment request
 ↓
Payment provider
 ↓
Payment completed
 ↓
Provider webhook
 ↓
Backend verifies signature
 ↓
Backend updates payment
 ↓
Backend confirms order
```

Payment webhooks must be idempotent.

Never store card number, CVV, or raw payment credentials.

------------------------------------------------------------------------

## 17. Inventory System

Inventory must prevent overselling.

Track:

``` text
SKU
Stock
Reserved
```

Checkout flow:

``` text
Available stock
 ↓
Reserve quantity
 ↓
Payment
 ↓
Success → deduct stock
Failure/timeout → release reservation
```

Use database transactions for inventory changes.

------------------------------------------------------------------------

## 18. Order Status System

Statuses:

``` text
PENDING
PAYMENT_PENDING
CONFIRMED
PROCESSING
SHIPPED
OUT_FOR_DELIVERY
DELIVERED
CANCELLED
REFUNDED
```

Order timeline:

``` text
Order Placed
      ↓
Confirmed
      ↓
Processing
      ↓
Shipped
      ↓
Out for Delivery
      ↓
Delivered
```

------------------------------------------------------------------------

## 19. Recommendation System

### Version 1

-   Same category
-   Same brand
-   Similar price
-   Trending products
-   Frequently viewed

### Version 2

Track:

-   Product views
-   Searches
-   Clicks
-   Wishlist additions
-   Cart additions
-   Purchases

Generate:

-   Recently viewed
-   Recommended for you
-   Similar products
-   Frequently bought together

------------------------------------------------------------------------

## 20. Homepage Design

Sections:

1.  Premium navbar
2.  Hero section
3.  Category navigation
4.  Featured products
5.  Trending products
6.  Promotional section
7.  New arrivals
8.  Recommendation section
9.  Brand section
10. Newsletter
11. Footer

Hero concept:

``` text
Everything you need.
Beautifully organized.

Find products without the clutter.

[ Explore Products ]    [ View Collections ]
```

------------------------------------------------------------------------

## 21. UI Design System

Design principles:

-   Minimal
-   Premium
-   Clean
-   Spacious
-   Responsive
-   Accessible
-   Content-first

Use:

-   Large whitespace
-   Rounded cards
-   Subtle borders
-   Soft shadows
-   Strong typography hierarchy
-   Consistent spacing
-   High-quality product photography

Avoid:

-   Excessive gradients
-   Excessive shadows
-   Excessive animations
-   Cluttered dashboards
-   Random colors
-   Unnecessary UI effects

------------------------------------------------------------------------

## 22. Design Tokens

Do not hardcode colors throughout components.

Use CSS variables/design tokens for:

-   Colors
-   Typography
-   Spacing
-   Border radius
-   Shadows
-   Motion
-   Breakpoints

Recommended typography:

-   Inter or Geist

Recommended spacing scale:

``` text
4
8
12
16
24
32
48
64
96
128
```

------------------------------------------------------------------------

## 23. Animation System

Motion philosophy:

> Motion should communicate state and hierarchy.

Use Motion / Framer Motion.

### Page enter

``` text
opacity: 0 → 1
translateY: 12px → 0
```

### Modal

``` text
opacity: 0 → 1
scale: 0.96 → 1
```

### Card hover

``` text
scale: 1 → 1.02
```

### Button press

``` text
scale: 1 → 0.98
```

### Drawer

``` text
translateX: 100% → 0
```

Timing:

``` text
Micro: 150–200ms
Normal: 250–400ms
Large: 400–700ms
```

------------------------------------------------------------------------

## 24. Shared Element Transitions

Use shared element transitions for:

-   Product card → Product page
-   Cart icon → Cart drawer
-   Thumbnail → Product gallery
-   Category card → Category page

Do not overuse shared element transitions.

------------------------------------------------------------------------

## 25. Scroll Experience

Use:

-   Smooth section reveals
-   Staggered product cards
-   Sticky product navigation
-   Limited parallax
-   Progressive image loading

Do not use excessive scroll-jacking.

Normal browser scrolling must remain functional.

------------------------------------------------------------------------

## 26. Loading States

Every asynchronous section must have a loading state.

Implement:

-   Skeleton cards
-   Skeleton product page
-   Skeleton search
-   Button loading state
-   Checkout loading state
-   Page loading state

Never leave the user with unexplained blank screens.

------------------------------------------------------------------------

## 27. Error Handling

Use a global error boundary.

Standard API error format:

``` json
{
  "success": false,
  "error": {
    "code": "PRODUCT_NOT_FOUND",
    "message": "Product not found"
  }
}
```

Handle:

``` text
400
401
403
404
409
422
429
500
```

------------------------------------------------------------------------

## 28. Security

Implement:

-   HTTPS
-   Secure cookies
-   HttpOnly cookies
-   CSRF protection where applicable
-   Rate limiting
-   Input validation
-   Output sanitization
-   Password hashing
-   Role-based authorization
-   API authorization
-   Webhook signature verification
-   SQL injection protection through Prisma
-   XSS protection
-   Security headers
-   CORS configuration
-   Request size limits
-   Environment variable secrets

Never expose secrets to the frontend.

------------------------------------------------------------------------

## 29. Authorization

Use RBAC.

### CUSTOMER

Customer routes only.

### SELLER

Seller dashboard and owned resources only.

### ADMIN

Full platform access.

Frontend route protection is not sufficient. Backend authorization is
mandatory.

------------------------------------------------------------------------

## 30. SEO

Product pages must have:

-   Dynamic title
-   Dynamic description
-   Canonical URL
-   Open Graph metadata
-   Social metadata
-   Product structured data
-   Breadcrumb structured data

Generate:

``` text
sitemap.xml
robots.txt
```

Use SEO-friendly URLs:

``` text
/products/iphone-15-pro
```

instead of:

``` text
/product?id=123
```

------------------------------------------------------------------------

## 31. Performance

Target Lighthouse scores of 90+ where practical.

Implement:

-   Next.js image optimization
-   Lazy loading
-   Code splitting
-   Server-side rendering where useful
-   Static generation where useful
-   CDN caching
-   Redis caching
-   Database indexing
-   Search indexing
-   Pagination
-   Infinite scrolling where appropriate
-   Minimized client-side JavaScript
-   Avoid unnecessary client components

------------------------------------------------------------------------

## 32. Caching

Use Redis for:

-   Product cache
-   Category cache
-   Session data if applicable
-   Rate limiting
-   Search suggestions
-   Temporary inventory reservations
-   Background job queues

Implement deliberate cache invalidation whenever products or categories
change.

------------------------------------------------------------------------

## 33. Background Jobs

Use Redis-based background job processing.

Jobs:

-   Send order email
-   Send shipping notification
-   Release expired inventory reservations
-   Update search index
-   Generate analytics
-   Process recommendations
-   Clean up expired sessions

------------------------------------------------------------------------

## 34. Notification System

Notification types:

``` text
ORDER_CONFIRMED
ORDER_SHIPPED
ORDER_DELIVERED
ORDER_CANCELLED
PAYMENT_SUCCESS
PAYMENT_FAILED
PRICE_DROP
BACK_IN_STOCK
WELCOME
```

Channels:

-   Email
-   In-app

Architecture should allow future SMS/push support.

------------------------------------------------------------------------

## 35. Admin Dashboard

Sections:

``` text
Overview
Products
Orders
Users
Sellers
Inventory
Payments
Coupons
Reviews
Analytics
Settings
```

Analytics:

-   Revenue
-   Orders
-   Average order value
-   Customers
-   Top products
-   Top categories
-   Conversion rate
-   Seller performance

------------------------------------------------------------------------

## 36. Seller Dashboard

Sections:

``` text
Overview
Products
Add Product
Orders
Inventory
Customers
Reviews
Revenue
Analytics
Settings
```

A seller must only access their own resources.

------------------------------------------------------------------------

## 37. Responsive Design

Breakpoints:

``` text
Mobile: 320px–767px
Tablet: 768px–1439px
Desktop: 1440px+
```

Product grid:

``` text
Desktop: 4 columns
Tablet: 2–3 columns
Mobile: 2 columns where appropriate
```

Provide a dedicated mobile navigation experience.

------------------------------------------------------------------------

## 38. Accessibility

Follow WCAG principles.

Implement:

-   Semantic HTML
-   Keyboard navigation
-   Focus states
-   ARIA where necessary
-   Alt text
-   Color contrast
-   Screen reader support
-   Reduced-motion support

When `prefers-reduced-motion` is enabled, disable or reduce
non-essential animations.

------------------------------------------------------------------------

## 39. API Response Format

### Success

``` json
{
  "success": true,
  "data": {},
  "meta": {}
}
```

### Error

``` json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message"
  }
}
```

------------------------------------------------------------------------

## 40. Logging

Use structured logs.

Log:

-   Request ID
-   HTTP method
-   Endpoint
-   Status
-   Response time
-   User ID when available
-   Error code

Never log:

-   Passwords
-   Tokens
-   Payment secrets
-   Card information

------------------------------------------------------------------------

## 41. Testing Strategy

### Unit Tests

Test:

-   Services
-   Utilities
-   Validation
-   Business logic

### Integration Tests

Test:

-   Authentication
-   Products
-   Cart
-   Orders
-   Payments

### E2E Tests

Test:

-   User registration
-   Login
-   Search
-   Product purchase
-   Payment
-   Order tracking
-   Seller product creation
-   Admin product management

------------------------------------------------------------------------

## 42. Critical E2E User Flow

``` text
Open website
 ↓
Browse products
 ↓
Search product
 ↓
Open product
 ↓
Select variant
 ↓
Add to cart
 ↓
Open cart
 ↓
Checkout
 ↓
Login
 ↓
Select address
 ↓
Apply coupon
 ↓
Pay
 ↓
Payment verification
 ↓
Order confirmation
 ↓
View order
 ↓
Track order
```

This flow must work before considering the core application complete.

------------------------------------------------------------------------

## 43. Development Phases

### Phase 1 --- Project Foundation

Create:

-   Monorepo
-   Next.js app
-   NestJS API
-   PostgreSQL
-   Prisma
-   Tailwind
-   Shared packages
-   Environment configuration
-   Git repository
-   Docker Compose

### Phase 2 --- Design System

Build:

-   Colors
-   Typography
-   Spacing
-   Buttons
-   Inputs
-   Cards
-   Modals
-   Navigation
-   Toasts
-   Skeletons

### Phase 3 --- Homepage

Build:

-   Navbar
-   Hero
-   Categories
-   Featured products
-   Trending products
-   Promotional sections
-   Footer

### Phase 4 --- Product System

Build:

-   Product database
-   Product API
-   Product listing
-   Product details
-   Variants
-   Images
-   Categories
-   Brands

### Phase 5 --- Authentication

Build:

-   Register
-   Login
-   Logout
-   Google OAuth
-   Email verification
-   Password reset
-   User profile

### Phase 6 --- Cart and Wishlist

Build:

-   Add to cart
-   Remove from cart
-   Quantity management
-   Variant management
-   Wishlist
-   Stock validation

### Phase 7 --- Checkout

Build:

-   Address
-   Shipping
-   Coupon
-   Tax
-   Order summary
-   Payment

### Phase 8 --- Orders

Build:

-   Order creation
-   Order history
-   Order details
-   Tracking
-   Cancellation
-   Refund state

### Phase 9 --- Reviews

Build:

-   Ratings
-   Reviews
-   Verified purchase
-   Review moderation

### Phase 10 --- Search

Build:

-   Search
-   Autocomplete
-   Filters
-   Sorting
-   Search indexing

### Phase 11 --- Admin

Build:

-   Admin dashboard
-   Product management
-   User management
-   Seller management
-   Order management
-   Analytics

### Phase 12 --- Seller Marketplace

Build:

-   Seller onboarding
-   Seller dashboard
-   Seller products
-   Inventory
-   Seller orders
-   Seller analytics

### Phase 13 --- Premium UX

Build:

-   Page transitions
-   Shared element transitions
-   Product animations
-   Skeleton transitions
-   Micro-interactions
-   Mobile gestures

### Phase 14 --- Performance

Optimize:

-   Images
-   Database
-   APIs
-   Caching
-   Search
-   Bundle size
-   Rendering

### Phase 15 --- Security and Testing

Complete:

-   Security audit
-   Unit tests
-   Integration tests
-   E2E tests
-   Accessibility tests
-   Performance testing

### Phase 16 --- Deployment

Deploy:

``` text
Frontend → Vercel
Backend → Railway/Render/AWS
Database → Managed PostgreSQL
Redis → Redis Cloud/Upstash
Search → Meilisearch
Images → Cloudinary
```

Configure:

-   Production environment variables
-   HTTPS
-   Domain
-   CI/CD
-   Monitoring
-   Error tracking

------------------------------------------------------------------------

## 44. Development Rules

1.  Use TypeScript everywhere.
2.  Avoid `any` unless absolutely necessary.
3.  Keep components small and reusable.
4.  Follow single-responsibility principles.
5.  Keep business logic out of UI components.
6.  Keep API calls inside service/query layers.
7.  Validate all external input.
8.  Never trust frontend values.
9.  Never expose secrets.
10. Use database transactions for financial and inventory operations.
11. Use meaningful names.
12. Avoid duplicated logic.
13. Use reusable design tokens.
14. Write tests for critical business logic.
15. Use accessible semantic HTML.
16. Optimize after measuring performance.
17. Do not introduce microservices prematurely.
18. Prefer a modular monolith until scaling requirements justify service
    separation.

------------------------------------------------------------------------

## 45. Git Strategy

Branches:

``` text
main
develop
feature/*
fix/*
hotfix/*
```

Commit examples:

``` text
feat: add product search
feat: implement cart
fix: prevent duplicate orders
perf: optimize product queries
refactor: improve product module
test: add checkout e2e tests
```

------------------------------------------------------------------------

## 46. Environment Variables

Create `.env.example`:

``` text
DATABASE_URL=
REDIS_URL=

NEXT_PUBLIC_API_URL=

AUTH_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=

STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

RESEND_API_KEY=

MEILISEARCH_HOST=
MEILISEARCH_API_KEY=

SENTRY_DSN=
```

Never commit real secrets.

------------------------------------------------------------------------

## 47. Docker Development

Docker Compose should provide:

-   PostgreSQL
-   Redis
-   Meilisearch

Developer workflow:

``` bash
docker compose up -d
npm install
npm run dev
```

------------------------------------------------------------------------

## 48. Antigravity Implementation Rules

Do not attempt to generate the entire application in one step.

Implement incrementally.

After every major phase:

1.  Generate code.
2.  Run the application.
3.  Run tests.
4.  Run TypeScript checks.
5.  Run lint.
6.  Inspect the UI.
7.  Fix errors.
8.  Verify the phase is complete.
9.  Continue to the next phase.

Never silently ignore build errors.

If a decision is ambiguous, prefer:

-   Simpler architecture
-   Strong typing
-   Reusable components
-   Secure backend logic
-   Production-friendly patterns
-   Minimal dependencies

Do not rewrite working architecture unnecessarily.

Before changing existing code, inspect the relevant files and understand
their dependencies.

------------------------------------------------------------------------

## 49. First Implementation Task

Start ONLY with Phase 1 --- Project Foundation.

Tasks:

1.  Inspect the current workspace.
2.  Determine whether an existing project is present.
3.  Do not delete or overwrite existing files without checking them.
4.  Create the monorepo structure.
5.  Set up Next.js + TypeScript.
6.  Set up NestJS + TypeScript.
7.  Set up Tailwind CSS.
8.  Set up Prisma.
9.  Configure PostgreSQL.
10. Configure Docker Compose for PostgreSQL, Redis, and Meilisearch.
11. Create shared packages.
12. Create `.env.example`.
13. Create the initial Prisma schema.
14. Create README documentation.
15. Configure linting and formatting.
16. Verify frontend build.
17. Verify backend build.
18. Verify Prisma/database connectivity.

Do NOT implement:

-   Payments
-   Seller marketplace
-   Recommendations
-   Advanced animations

during Phase 1.

Fix all build and type errors before finishing.

At the end of Phase 1, report:

-   Files created
-   Dependencies installed
-   Commands executed
-   Tests/checks completed
-   Build status
-   Database status
-   Remaining issues

Then STOP.

------------------------------------------------------------------------

## 50. Definition of Done

The final project is considered complete only when:

-   Frontend works on desktop and mobile.
-   Backend API is functional.
-   Database migrations work.
-   Authentication works.
-   Product catalog works.
-   Search works.
-   Cart works.
-   Wishlist works.
-   Checkout works.
-   Payment verification works.
-   Orders work.
-   Inventory protection works.
-   Reviews work.
-   Admin dashboard works.
-   Seller dashboard works.
-   Security controls are implemented.
-   Critical E2E flows pass.
-   Accessibility has been checked.
-   Performance has been optimized.
-   Production deployment works.
-   Environment secrets are properly configured.
-   Documentation is complete.

The final application should look and behave like a real commercial
e-commerce platform, not a tutorial project.
