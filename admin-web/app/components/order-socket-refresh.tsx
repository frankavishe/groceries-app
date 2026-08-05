'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { io } from 'socket.io-client';
import { BACKEND_WS_URL } from '@/lib/config';

const POLL_FALLBACK_MS = 15000;
// "a few seconds" per specs/realtime/design.md — long enough that a brief
// reconnect blip doesn't spin up a redundant poller, short enough that a
// genuinely dead socket doesn't leave the view stale for long.
const DISCONNECT_GRACE_MS = 5000;

// Req 8/[[../realtime/requirements]] Req 1-3: subscribes the order list/detail
// views to live status pushes. Req 3 (constitution's polling-first rule): the
// socket is purely an enhancement — a 15s poll (the exact same
// router.refresh() PollingRefresh already used) starts immediately and only
// stops once the socket proves itself connected, and restarts if the socket
// has been down for more than DISCONNECT_GRACE_MS. The view is never
// dependent on the socket alone for correctness.
function useOrderSocket(token: string | null): void {
  const router = useRouter();

  useEffect(() => {
    if (!token) return;

    let pollId: ReturnType<typeof setInterval> | undefined;
    let disconnectTimer: ReturnType<typeof setTimeout> | undefined;

    const startPolling = () => {
      pollId ??= setInterval(() => router.refresh(), POLL_FALLBACK_MS);
    };
    const stopPolling = () => {
      if (pollId) {
        clearInterval(pollId);
        pollId = undefined;
      }
    };
    const armFallback = () => {
      disconnectTimer ??= setTimeout(startPolling, DISCONNECT_GRACE_MS);
    };
    const disarmFallback = () => {
      if (disconnectTimer) {
        clearTimeout(disconnectTimer);
        disconnectTimer = undefined;
      }
    };

    const socket = io(`${BACKEND_WS_URL}/ws/orders`, {
      auth: { token },
      reconnectionDelay: 2000,
    });

    socket.on('connect', () => {
      disarmFallback();
      stopPolling();
    });
    socket.on('order:status-changed', () => {
      router.refresh();
    });
    socket.on('disconnect', armFallback);
    socket.on('connect_error', armFallback);

    // Covers a slow/failed first connection attempt too, not just a later
    // disconnect.
    armFallback();

    return () => {
      disarmFallback();
      stopPolling();
      socket.disconnect();
    };
  }, [token, router]);
}

export function OrderSocketRefresh({ token }: { token: string | null }) {
  useOrderSocket(token);
  return null;
}
