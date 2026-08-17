// Server-side only: like admin-web, this app never calls the REST API from
// the browser (see lib/api.ts), so this URL is never exposed to client
// bundles. No NEXT_PUBLIC_* WebSocket URL exists here — unlike admin-web,
// this app has no browser-originated realtime connection (see
// specs/customer-web/design.md's Non-Goals: polling only, matching mobile).
export const BACKEND_URL =
  process.env.BACKEND_API_URL ?? 'http://localhost:4000/api/v1';
