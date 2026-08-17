import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Duplicated (not imported) from lib/session.ts: proxy.ts cannot import
// next/headers' cookies() API, so it reads the cookie straight off the
// NextRequest instead — same reasoning as admin-web/proxy.ts. Decoding is
// UX-only; the backend verifies the JWT on every real API call.
const SESSION_COOKIE = 'customer_token';

const PUBLIC_PATHS = ['/login', '/register', '/verify-otp'];

// Req 6: no guest browsing — every route other than the auth flow itself
// requires a session cookie, matching mobile-app's login-gated app shell
// (specs/customer-web/design.md's Auth Integration section). Unlike
// admin-web, there's only one destination role (CUSTOMER), so no role
// branching is needed here — non-CUSTOMER logins are rejected at
// app/login/actions.ts instead.
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE)?.value;

  const isPublicPath = PUBLIC_PATHS.some((path) => pathname.startsWith(path));

  if (isPublicPath) {
    if (token && pathname.startsWith('/login')) {
      return NextResponse.redirect(new URL('/', request.url));
    }
    return NextResponse.next();
  }

  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
