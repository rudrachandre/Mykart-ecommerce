# Contributing to MyKart

Thank you for your interest in contributing to **MyKart**! This document outlines our development workflows, code standards, and submission guidelines.

---

## 🛠️ 1. Local Development Setup

1. **Fork & Clone Repository**:
   ```bash
   git clone https://github.com/rudrachandre/Mykart-ecommerce.git
   cd Mykart-ecommerce
   ```
2. **Install Dependencies**:
   ```bash
   npm install
   ```
3. **Setup Environment File**:
   ```bash
   cp .env.example .env
   ```
4. **Push Schema & Seed Database**:
   ```bash
   npx prisma db push --schema prisma/schema.prisma
   npx ts-node apps/api/seed-data.ts
   ```
5. **Start Local Dev Servers**:
   ```bash
   npm run dev
   ```

---

## 🌿 2. Branch Naming & Commit Conventions

### Branch Naming Format
Use descriptive branch prefixes:
- `feat/feature-name` — New feature additions
- `fix/bug-name` — Bug fixes and resolution
- `docs/doc-name` — Documentation improvements
- `refactor/refactor-name` — Code quality & cleanup

### Commit Message Guidelines
Follow standard Conventional Commits:
```text
feat: add product variant stock filter
fix: prevent admin role demotion on seller onboarding
docs: update API reference guide
test: add inventory reservation unit test
```

---

## 🧪 3. Quality & Testing Expectations Before PR

Before opening a Pull Request, verify that all validation steps pass cleanly:

```bash
# 1. NestJS API Build
npm --prefix apps/api run build

# 2. Next.js Web Build
npm --prefix apps/web run build

# 3. Unit & Integration Tests
npm test -w apps/api

# 4. Playwright E2E Tests (Optional locally, verified on CI)
npx playwright test
```

---

## 📋 4. Pull Request Checklist

- [ ] Code builds without errors or warnings.
- [ ] No temporary `console.log` or debug endpoints included.
- [ ] Tests pass cleanly.
- [ ] No hardcoded credentials or secrets committed.
- [ ] Documentation updated if introducing new features or endpoints.
