# Grocery Delivery Platform

Three-app monorepo for a Tanzanian grocery delivery platform. See `PLAN.md` for the full build roadmap, `specs/constitution.md` for project-wide invariants, and `specs/*` for per-module requirements/design/tasks.

## Layout

```
/backend        NestJS API Gateway (TypeScript, TypeORM, PostgreSQL, Redis)
/admin-web      Next.js admin dashboard
/customer-web   Next.js customer storefront
/mobile-app     Flutter Android app
/specs          Spec-driven-development artifacts (requirements/design/tasks per module)
/docs           Generated API contract / OpenAPI, ERD, ADRs
/infra          docker-compose (local Postgres + Redis), env templates
```

## Local development

```bash
# 1. Start Postgres + Redis
cd infra && docker compose up -d

# 2. Backend (NestJS) — needs backend/.env (see "Environment variables" below)
cd backend && npm install
npm run migration:run   # apply the schema
npm run seed             # optional: 1 admin user, 5 categories, 12 products
npm run start:dev        # http://localhost:4000

# 3. Admin dashboard (Next.js)
cd admin-web && npm install && npm run dev        # http://localhost:3000 (or pass -p if occupied)

# 4. Customer storefront (Next.js)
cd customer-web && npm install && npm run dev -- -p 3001   # http://localhost:3001

# 5. Mobile app (Flutter, Android)
cd mobile-app && flutter pub get && flutter run
```

Ports for the web dev servers aren't hardcoded beyond the backend's default (`PORT` env var, defaults to 4000) — pick a free port with `-p` if the default is occupied locally. The docker-compose Postgres is mapped to host port **5433**, not the Postgres default 5432 — pick whatever's free on your machine if 5433 is also taken locally.

### Environment variables

`.env.example` files aren't tracked in this repo (gitignored). Create `backend/.env` (and `infra/.env` if you want docker-compose to read one) with at least:

```
PORT=4000
DB_HOST=localhost
DB_PORT=5433
DB_USER=groceries
DB_PASSWORD=groceries
DB_NAME=groceries
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_SECRET=change-me-in-every-environment
JWT_ACCESS_TOKEN_TTL=86400
```
