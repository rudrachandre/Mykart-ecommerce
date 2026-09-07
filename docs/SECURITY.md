# MyKart — Security Architecture & Threat Protection Specifications

MyKart implements an enterprise-grade security model designed to defend against common web application vulnerabilities (OWASP Top 10) while maintaining stateless API scalability and developer ergonomics.

---

## 🔐 1. Authentication Architecture & Token Lifecycles

### Dual-Token JWT Strategy
- **Short-Lived Access Tokens**:
  - Signed using secret keys via NestJS Auth Module.
  - Lifespan: **15 minutes**.
  - Transmitted via HTTP `Authorization: Bearer <token>` header for stateless API access.
- **Long-Lived Refresh Tokens**:
  - Lifespan: **7 days**.
  - Transmitted exclusively via **HttpOnly, Secure, SameSite=Lax/Strict** cookies.
  - The Argon2 hash of active refresh tokens is stored in `User.refreshTokenHash` to prevent raw token compromise abuse.

### Refresh Token Rotation & Reuse Detection
- **Token Rotation**: Every time `/api/v1/auth/refresh` is called, the current refresh token is revoked and a new access/refresh token pair is issued.
- **Token Family Reuse Detection**: If an invalidated or previously used refresh token is presented, the system detects potential token theft and immediately revokes the entire token family (`User.refreshTokenHash = null`), forcing re-authentication to protect user accounts.
- **Session Revocation**: Logging out (`POST /api/v1/auth/logout`) explicitly clears auth cookies and nullifies the database refresh token hash.

### Google OAuth 2.0 Integration
- Uses PKCE (Proof Key for Code Exchange) flow over secure HTTPS endpoints.
- Validates OAuth `state` tokens to prevent Cross-Site Request Forgery (CSRF).
- Links authenticated Google profile emails with existing marketplace accounts securely.

---

## 🛡️ 2. Role-Based Access Control (RBAC) & Authorization Boundaries

MyKart enforces strict RBAC across 3 user roles: `CUSTOMER`, `SELLER`, `ADMIN`.

```text
+-------------------+---------------------------------------------------------+
| Role              | Permitted Route Scope & Privileges                       |
+-------------------+---------------------------------------------------------+
| CUSTOMER          | Account profile, Cart, Checkout, Order History, Wishlist |
| SELLER            | Seller Center, Catalog Management, Inventory, Fulfillment|
| ADMIN             | Admin Panel, GMV Analytics, Seller Approvals, User RBAC |
+-------------------+---------------------------------------------------------+
```

- Enforced at the NestJS layer using custom `@Roles('CUSTOMER', 'SELLER', 'ADMIN')` decorators and `PermissionsGuard`.
- Unauthenticated access returns `401 Unauthorized`.
- Authenticated requests with insufficient role privileges return `403 Forbidden`.

---

## 🚫 3. Insecure Direct Object Reference (IDOR) Prevention

Every sensitive resource operation (viewing orders, editing seller products, updating user addresses) enforces **server-side ownership verification** against the caller's JWT payload:

```typescript
// Server-Side Ownership Check Pattern (IDOR Defense)
const order = await this.prisma.order.findUnique({ where: { id: orderId } });
if (!order) throw new NotFoundException('Order not found');

// Admin override OR resource owner match required
if (user.role !== 'ADMIN' && order.userId !== user.id) {
  throw new ForbiddenException('Access denied: You do not own this resource');
}
```

---

## 🔒 4. Data Protection, Encryption & Secret Management

- **Password Cryptography**: Passwords stored using **Argon2** / **Bcrypt** cryptographic hashing algorithms with a minimum cost factor of 10.
- **Transport Security (TLS/HTTPS)**: Mandatory HTTPS enforced across Vercel frontend, Render backend, and Neon database connections.
- **Strict Secret Management**: Zero hardcoded credentials. All JWT secrets, database connection strings, Cloudinary keys, and API tokens are loaded exclusively via environment variables and excluded from version control (`.gitignore`).

---

## 🚦 5. Input Sanitization, Rate Limiting & Production Hardening

- **DTO Input Validation**: API request payloads are parsed and validated strictly using `class-validator` and `zod` schemas.
- **SQL Injection Prevention**: Prisma ORM executes parameterized SQL queries exclusively, eliminating SQL injection vectors.
- **Rate Limiting (Brute-Force Defense)**: NestJS `@nestjs/throttler` backed by Redis sliding window counters limits IP requests (e.g. maximum 10 auth requests per minute).
- **CORS Protection**: Access to the REST API is restricted to authorized origins specified in `CORS_ORIGIN`.
