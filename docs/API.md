# MyKart — REST API Specification & Swagger Guide

The MyKart backend API is built with NestJS 10 and provides a versioned, RESTful API interface (`/api/v1`).

---

## 📡 1. Swagger OpenAPI Documentation

When running the API server locally or viewing in production:
- **Interactive Swagger UI**: `https://mykart-ecommerce.onrender.com/api/docs` (or `http://localhost:3001/api/docs` locally).

---

## 🔐 2. Authentication Headers

For authenticated endpoints (Customer, Seller, Admin), include the JWT Access Token in the Authorization header:

```http
Authorization: Bearer <your_jwt_access_token>
```

---

## 📋 3. Endpoint Reference Matrix

### Public Endpoints
- `GET /api/v1/health` — API health status check
- `GET /api/v1/products` — Retrieve catalog products (supports pagination, category, brand, search filters)
- `GET /api/v1/products/:slug` — Retrieve single product details by slug
- `GET /api/v1/categories` — List parent categories and subcategories
- `GET /api/v1/brands` — List authentic brand objects

### Auth Endpoints
- `POST /api/v1/auth/register` — Customer account registration
- `POST /api/v1/auth/login` — Account login (returns access token & sets HttpOnly refresh cookie)
- `GET /api/v1/auth/google` — Initiate Google OAuth 2.0 PKCE flow
- `GET /api/v1/auth/google/callback` — Google OAuth callback endpoint
- `POST /api/v1/auth/refresh` — Rotate access token using valid refresh token cookie
- `POST /api/v1/auth/logout` — Revoke session and clear auth cookies

### Customer Endpoints (Protected)
- `GET /api/v1/users/profile` — Get authenticated user profile
- `PUT /api/v1/users/profile` — Update user profile details
- `GET /api/v1/cart` — Get user cart items
- `POST /api/v1/cart/items` — Add item to cart
- `DELETE /api/v1/cart/items/:id` — Remove item from cart
- `POST /api/v1/orders` — Create new order
- `GET /api/v1/orders` — Get customer order history
- `GET /api/v1/wishlist` — Get customer wishlist items
- `POST /api/v1/wishlist/:productId` — Add/remove item from wishlist

### Seller Endpoints (Protected - Role: SELLER / ADMIN)
- `POST /api/v1/seller/onboard` — Register as seller
- `GET /api/v1/seller/products` — Get seller catalog products
- `POST /api/v1/seller/products` — Create new seller product
- `GET /api/v1/seller/inventory` — View seller inventory levels
- `PUT /api/v1/seller/inventory` — Update variant stock quantities
- `GET /api/v1/seller/orders` — List orders containing seller items

### Admin Endpoints (Protected - Role: ADMIN)
- `GET /api/v1/admin/analytics` — Executive GMV and order analytics
- `GET /api/v1/admin/users` — List all marketplace users
- `PUT /api/v1/admin/users/:id/role` — Update user role assignment
- `GET /api/v1/admin/sellers` — View pending/approved seller applications
- `PUT /api/v1/admin/sellers/:id/verify` — Approve seller registration
