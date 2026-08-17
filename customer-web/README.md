# customer-web

Customer-facing storefront (Next.js) for the groceries platform — browse, cart, checkout, pay, and track orders against the same backend the mobile app uses. See `specs/customer-web/` for requirements/design/tasks.

## Getting started

```bash
npm install
npm run dev
```

Requires the backend running locally (see root `README.md`) and a `.env.local` with `BACKEND_API_URL` pointing at it (defaults to `http://localhost:4000/api/v1`).
