// Server-side only: the admin-web app never calls the REST API from the
// browser (see specs/admin-web/design.md's "Data Fetching" section), so this
// URL is never exposed to client bundles.
export const BACKEND_URL = process.env.BACKEND_API_URL ?? 'http://localhost:4000/api/v1';

// Client-side: the one exception to the "server-only fetch" rule above. The
// browser opens a direct WebSocket connection to the backend for realtime
// order-status push (specs/realtime/design.md) — REST stays server-side, but
// a browser-originated WS handshake needs its auth token in the browser, so
// this must be NEXT_PUBLIC_* to reach client bundles. No /api/v1 prefix: the
// gateway isn't mounted under the REST global prefix.
export const BACKEND_WS_URL =
  process.env.NEXT_PUBLIC_BACKEND_WS_URL ?? 'http://localhost:4000';
