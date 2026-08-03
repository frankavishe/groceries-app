import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Duplicated (not imported) from lib/session.ts: proxy.ts cannot import
// next/headers' cookies() API, so it reads the cookie straight off the
// NextRequest instead. Decoding here is UX-only (redirect target); the
// backend verifies the JWT signature and role on every real API call.
const SESSION_COOKIE = 'admin_token';

interface DecodedSession {
  role?: string;
}

function decodeRole(token: string): string | null {
  try {
    const [, payload] = token.split('.');
    if (!payload) return null;
    const json = Buffer.from(payload, 'base64url').toString('utf-8');
    return (JSON.parse(json) as DecodedSession).role ?? null;
  } catch {
    return null;
  }
}

// Req 1-2: gate every admin route behind a valid ADMIN session; redirect
// unauthenticated visitors to /login and non-admin sessions to /unauthorized.
// specs/delivery/tasks.md's open decision (agents reuse this same admin-web
// login, scoped by role) adds a second gate: /delivery/* requires
// DELIVERY_AGENT instead of ADMIN, and everything else remains ADMIN-only.
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const role = token ? decodeRole(token) : null;

  if (pathname.startsWith('/login')) {
    if (role === 'ADMIN') {
      return NextResponse.redirect(new URL('/categories', request.url));
    }
    if (role === 'DELIVERY_AGENT') {
      return NextResponse.redirect(new URL('/delivery', request.url));
    }
    return NextResponse.next();
  }

  if (pathname.startsWith('/unauthorized')) {
    return NextResponse.next();
  }

  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (pathname.startsWith('/delivery')) {
    if (role !== 'DELIVERY_AGENT') {
      return NextResponse.redirect(new URL('/unauthorized', request.url));
    }
    return NextResponse.next();
  }

  if (role !== 'ADMIN') {
    return NextResponse.redirect(new URL('/unauthorized', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
