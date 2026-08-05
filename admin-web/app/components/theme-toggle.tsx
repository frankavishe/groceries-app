'use client';

import { useSyncExternalStore } from 'react';

// The `dark` class on <html> is external state — written by the inline
// script in layout.tsx before first paint, and by setDark() below — so we
// read it via useSyncExternalStore rather than useState+useEffect. That
// also sidesteps the SSR/client mismatch: React reconciles the server's
// `getServerSnapshot` guess against the real class right after hydration
// without a manual mounted-flag dance.
const listeners = new Set<() => void>();

function subscribe(onStoreChange: () => void) {
  listeners.add(onStoreChange);
  return () => listeners.delete(onStoreChange);
}

function getSnapshot() {
  return document.documentElement.classList.contains('dark');
}

function getServerSnapshot() {
  return false;
}

function setDark(next: boolean) {
  document.documentElement.classList.toggle('dark', next);
  localStorage.setItem('theme', next ? 'dark' : 'light');
  listeners.forEach((listener) => listener());
}

export function ThemeToggle() {
  const dark = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  return (
    <button
      type="button"
      onClick={() => setDark(!dark)}
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="rounded p-2 text-sm text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
    >
      {dark ? '☀️' : '🌙'}
    </button>
  );
}
