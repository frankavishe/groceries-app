// Server-side only: the admin-web app never calls the backend from the browser
// (see specs/admin-web/design.md's "Data Fetching" section), so this URL is
// never exposed to client bundles.
export const BACKEND_URL = process.env.BACKEND_API_URL ?? 'http://localhost:4000/api/v1';
