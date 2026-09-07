# MyKart — REST API Reference Guide & Swagger Specification

The MyKart API is built with NestJS 10 and exposes a versioned RESTful interface (`/api/v1`).

---

## 📡 1. Interactive Swagger OpenAPI Documentation

Interactive Swagger API documentation with live execution and payload schemas is accessible at:
- **Production Swagger UI**: `https://mykart-ecommerce.onrender.com/api/docs`
- **Local Swagger UI**: `http://localhost:3001/api/docs`

---

## 🔐 2. Authentication & Authorization Headers

Protected endpoints require the JWT Access Token passed via the HTTP Authorization header:

```http
Authorization: Bearer <your_jwt_access_token>
```

Refresh tokens are handled via HttpOnly, Secure cookies named `refreshToken`.

---

## 📋 3. REST API Endpoint Directory

### Public Endpoints
| HTTP Method | Route | Description | Auth Required |
| :--- | :--- | :--- | :---: |
| `GET` | `/api/v1/health` | Health check endpoint returning API status | No |
| `GET` | `/api/v1/products` | Query product catalog (supports search, category, brand, price filters) | No |
| `GET` | `/api/v1/products/:slug` | Retrieve single product detail payload by slug | No |
| `GET` | `/api/v1/categories` | Retrieve hierarchical category tree | No |
| `GET` | `/api/v1/brands` | List authentic brand entities | No |
| `GET` | `/api/v1/search` | Execute typo-tolerant fuzzy search via Meilisearch | No |

### Auth Module (`/api/v1/auth`)
| HTTP Method | Route | Description | Role / Requirements |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/auth/register` | Register new customer account | Public |
| `POST` | `/api/v1/auth/login` | Authenticate account (returns access token & sets HttpOnly refresh cookie) | Public |
| `GET` | `/api/v1/auth/google` | Initiate Google OAuth 2.0 PKCE flow | Public |
| `GET` | `/api/v1/auth/google/callback` | Google OAuth callback handler | Public |
| `POST` | `/api/v1/auth/refresh` | Rotate access token using valid refresh token cookie | Cookie |
| `POST` | `/api/v1/auth/logout` | Invalidate refresh token and clear auth cookies | Authenticated |

### Customer Suite (`/api/v1/*`)
| HTTP Method | Route | Description | Role Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/users/profile` | Get authenticated user profile details | Any Authenticated |
| `PUT` | `/api/v1/users/profile` | Update profile information | Any Authenticated |
| `GET` | `/api/v1/cart` | Retrieve user cart items and price breakdown | Any Authenticated |
| `POST` | `/api/v1/cart/items` | Add item to cart | Any Authenticated |
| `DELETE` | `/api/v1/cart/items/:id` | Remove item from cart | Any Authenticated |
| `POST` | `/api/v1/orders` | Create new order (deducts stock and clears cart) | Any Authenticated |
| `GET` | `/api/v1/orders` | List customer order history | Any Authenticated |
| `GET` | `/api/v1/orders/:id` | Retrieve single order details (IDOR verified) | Any Authenticated |
| `GET` | `/api/v1/wishlist` | Retrieve customer saved wishlist items | Any Authenticated |
| `POST` | `/api/v1/wishlist/:productId` | Add/remove product from wishlist | Any Authenticated |
| `POST` | `/api/v1/reviews` | Submit product review | Any Authenticated |
| `GET` | `/api/v1/notifications` | List user notification alerts | Any Authenticated |

### Seller Center (`/api/v1/seller`)
| HTTP Method | Route | Description | Role Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/seller/onboard` | Submit seller store onboarding application | `CUSTOMER` / `ADMIN` |
| `GET` | `/api/v1/seller/products` | List products belonging to seller store | `SELLER` / `ADMIN` |
| `POST` | `/api/v1/seller/products` | Create new catalog product | `SELLER` / `ADMIN` |
| `GET` | `/api/v1/seller/inventory` | List variant stock inventory levels | `SELLER` / `ADMIN` |
| `PUT` | `/api/v1/seller/inventory` | Update variant stock counts | `SELLER` / `ADMIN` |
| `GET` | `/api/v1/seller/orders` | List customer orders containing seller products | `SELLER` / `ADMIN` |
| `PUT` | `/api/v1/seller/orders/:id/status` | Update fulfillment status (`PROCESSING`, `SHIPPED`, `DELIVERED`) | `SELLER` / `ADMIN` |

### Admin Control Panel (`/api/v1/admin`)
| HTTP Method | Route | Description | Role Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/admin/analytics` | Executive marketplace GMV and revenue metrics | `ADMIN` |
| `GET` | `/api/v1/admin/users` | List all marketplace accounts | `ADMIN` |
| `PUT` | `/api/v1/admin/users/:id/role` | Update user role assignment (`CUSTOMER`, `SELLER`, `ADMIN`) | `ADMIN` |
| `GET` | `/api/v1/admin/sellers` | List seller onboarding applications | `ADMIN` |
| `PUT` | `/api/v1/admin/sellers/:id/verify` | Approve seller verification request | `ADMIN` |

---

## 🚦 4. Standard Response & HTTP Status Codes

- `200 OK` — Request completed successfully.
- `201 Created` — Resource successfully created.
- `400 Bad Request` — Validation failure (class-validator DTO check failed).
- `401 Unauthorized` — Missing or invalid JWT Access Token.
- `403 Forbidden` — Insufficient role permissions or IDOR ownership mismatch.
- `404 Not Found` — Resource or route does not exist.
- `429 Too Many Requests` — Rate limit exceeded.
- `500 Internal Server Error` — Server exception (sanitized in production).
