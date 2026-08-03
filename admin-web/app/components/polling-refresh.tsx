'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

// Req 8: no WebSocket gateway exists yet (realtime module is M10, not
// implemented) — per specs/constitution.md's polling-first rule, this is the
// full implementation for now, not a fallback bolted onto a socket. Re-runs
// the server components for the current route so order status stays fresh
// without a manual page reload. Shared by both the admin orders views and the
// delivery-agent view (specs/delivery), not admin-specific.
export function PollingRefresh({ intervalMs = 15000 }: { intervalMs?: number }) {
  const router = useRouter();

  useEffect(() => {
    const id = setInterval(() => router.refresh(), intervalMs);
    return () => clearInterval(id);
  }, [router, intervalMs]);

  return null;
}
