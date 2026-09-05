# MyKart — Feature Breakdown & Domain Capability Matrix

MyKart features three distinct user portals: **Customer Portal**, **Seller Center**, and **Admin Control Panel**.

---

## 🛍️ 1. Customer Features

### Authentication & Account Security
- **Email/Password Sign-In & Registration**: Password hashed with Argon2, client-side & server-side validation.
- **Google OAuth 2.0 Integration**: One-click Google Sign-In with automated account linking.
- **Session Management**: JWT access token in-memory and HttpOnly refresh token cookie rotation.
- **Customer Profile & Address Book**: Save multiple delivery addresses with default selection.

### Product Discovery & Catalog Exploration
- **Homepage Showcase**: Hero deals carousel, trending products, top categories grid, brand bar, and flash discounts.
- **Category Navigation**: 8 parent categories and 40+ subcategories with dynamic breadcrumbs.
- **Brand Pages**: Explore dedicated brand landing pages for all 46 authentic brands.
- **Live Search & Autocomplete**: Instant search suggestions modal with image thumbnails and instant navigation.
- **Algolia/Amazon-style Filter Sidebar**:
  - **Dual-Range Price Slider**: Interactive dual handles with Indian Rupee formatting.
  - **Dual-Range Discount Slider**: Interactive dual handles for percentage filtering.
  - **Dynamic Brand Checkboxes**: Live search inside brand list with "See more" expansion.
  - **Star Rating Radio Filters**: Filter by 4★+, 3★+, 2★+, 1★+.
  - **Stock Availability**: Toggle to hide out-of-stock items.

### Product Details & Interaction
- **Product Detail Page (PDP)**: High-resolution image gallery, price savings pill, stock badge, variant selector (color/size), detailed specifications tab, and customer reviews list.
- **Wishlist Manager**: Interactive heart icon to save products to customer wishlist.

### Cart & Checkout Flow
- **Cart Management**: Real-time quantity increment/decrement, cart item removal, total savings calculation.
- **Checkout Process**:
  - Address selection / inline new address entry.
  - Coupon code validation & percentage/fixed discount deduction.
  - Payment Method Selection: Cash on Delivery (COD), UPI (QR Code / VPA), Credit/Debit Card UI.
  - Order Confirmation screen with order breakdown and itemized receipt.

### Customer Dashboard & History
- **My Orders**: View order history, order status badge (Pending, Processing, Shipped, Delivered, Cancelled), tracking timeline, and order detail view.
- **Notifications Inbox**: Real-time system alerts for order status changes and promotional offers.

---

## 🏭 2. Seller Features

### Seller Onboarding & Store Setup
- **Seller Registration**: Register business name, store slug, GSTIN, and contact details.
- **Store Settings**: Update store profile, contact email, and seller banner.

### Product & Catalog Management
- **Add New Product**: Multi-step form for name, description, price, sale price, category, brand, SKU, stock, and image URLs.
- **Edit Catalog Items**: Modify existing product listings, pricing, and active status.

### Inventory Control
- **Stock Dashboard**: View current stock levels across all variants.
- **Low-Stock Alerts**: Highlighted low-stock warnings when inventory drops below threshold.

### Order Fulfillment
- **Seller Orders List**: Filter orders by status (Pending, Processing, Shipped, Delivered).
- **Status Updates**: Advance orders through fulfillment pipeline with tracking notes.

### Reviews & Promotions
- **Seller Reviews Manager**: View customer ratings and feedback for sold items.
- **Seller Coupon Creator**: Create promotional coupon codes tied to seller store products.

---

## 🛡️ 3. Admin Features

### Executive Dashboard & Analytics
- **Marketplace Metrics**: Total Gross Merchandise Value (GMV), total active orders, registered customer count, active seller count.
- **Sales Analytics Charts**: Monthly revenue trends, top-selling categories, and seller performance.

### Governance & Verification
- **Seller Verification**: Approve or suspend seller accounts.
- **User Management**: View user list, modify role assignments (Customer, Seller, Admin), toggle active account status.

### Catalog Governance
- **Category Manager**: Create, edit, or delete parent categories and subcategories.
- **Brand Manager**: Maintain authentic brand definitions, logos, and slugs.

### Audit & System Logging
- **Global Audit Logs**: Immutable audit log of administrative actions, user permission updates, and order state overrides.
