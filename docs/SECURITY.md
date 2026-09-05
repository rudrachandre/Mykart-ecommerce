# MyKart — Security Model & Protection Specifications

MyKart implements an enterprise-grade security model designed to defend against common web application vulnerabilities (OWASP Top 10) while ensuring stateless scalability.

---

## 🔐 1. Authentication Architecture

### Dual-Token JWT Strategy
- **Short-Lived Access Tokens**:
  - Encoded using RS256 / HS256 secret signed by the NestJS Auth Module.
  - Expiration: **15 minutes**.
  - Transmitted via HTTP `Authorization: Bearer <token>` header for API requests.
- **Long-Lived Refresh Tokens**:
  - Expiration: **7 days**.
  - Stored in production in **HttpOnly, Secure, SameSite=Lax/Strict** cookies.
  - Hash of the active refresh token is stored in the database (`User.refreshTokenHash`) using Argon2/Bcrypt to prevent token theft abuse.

### Google OAuth 2.0 Integration
- Implements PKCE (Proof Key for Code Exchange) flow over standard HTTPS endpoints.
- Verifies OAuth state and nonce to prevent Cross-Site Request Forgery (CSRF).
- Links authenticated Google accounts seamlessly with local email records.

---

## 🛡️ 2. Authorization & Role-Based Access Control (RBAC)

- **User Roles**: `CUSTOMER`, `SELLER`, `ADMIN`.
- Enforced at the NestJS route handler layer via `@Roles(...)` metadata and `PermissionsGuard`.
- Unauthenticated requests to protected endpoints return `401 Unauthorized`.
- Authenticated requests with insufficient privileges return `403 Forbidden`.

---

## 🚫 3. Insecure Direct Object Reference (IDOR) Prevention

Every sensitive resource access (e.g. retrieving user addresses, viewing order details, editing seller products) enforces **server-side ownership verification**:

```typescript
// Example Server-Side Ownership Check Pattern
const order = await this.prisma.order.findUnique({ where: { id: orderId } });
if (!order) throw new NotFoundException('Order not found');

if (user.role !== 'ADMIN' && order.userId !== user.id) {
  throw new ForbiddenException('You do not have access to this resource');
}
```

---

## 🛡️ 4. Data Protection & Cryptography

- **Password Hashing**: Passwords stored using **Argon2** / **Bcrypt** with a minimum work factor of 10.
- **Transport Layer Security (TLS)**: Mandatory HTTPS forced in production on both Vercel frontend and Render backend.
- **Zero Exposed Secrets**: All sensitive keys, JWT secrets, database connection strings, and API credentials are kept in environment variables and are excluded from Git repository tracking (`.gitignore`).

---

## 🚦 5. Input Sanitization & Rate Limiting

- **Input Validation**: API DTOs strictly parsed using `class-validator` and `zod` schema definitions.
- **SQL Injection Prevention**: Prisma ORM executes parameterized queries under the hood, completely eliminating SQL injection vectors.
- **Rate Limiting**: NestJS `@nestjs/throttler` backed by Redis sliding window counters limits requests per IP (e.g., max 10 login requests per minute) to defend against brute-force attacks.
