# Grocery Delivery Platform

Three-app monorepo for a Tanzanian grocery delivery platform. See `PLAN.md` for the full build roadmap, `specs/constitution.md` for project-wide invariants, and `specs/*` for per-module requirements/design/tasks.

## Layout

```
/backend        NestJS API Gateway (TypeScript, TypeORM, PostgreSQL, Redis)
/admin-web      Next.js admin dashboard
/mobile-app     Flutter Android app
/specs          Spec-driven-development artifacts (requirements/design/tasks per module)
/docs           Generated API contract / OpenAPI, ERD, ADRs
/infra          docker-compose (local Postgres + Redis), env templates
```

## Local development

```bash
# 1. Start Postgres + Redis
cd infra && docker compose up -d

# 2. Backend (NestJS) — copy infra/.env.example to backend/.env first
cd backend && npm install && npm run start:dev   # http://localhost:4000

# 3. Admin dashboard (Next.js)
cd admin-web && npm install && npm run dev        # http://localhost:3000 (or pass -p if occupied)

# 4. Mobile app (Flutter, Android)
cd mobile-app && flutter pub get && flutter run
```

Ports for the web dev servers aren't hardcoded beyond the backend's default (`PORT` env var, defaults to 4000) — pick a free port with `-p` if the default is occupied locally.
