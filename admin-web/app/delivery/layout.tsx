import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { logoutAction } from '../logout-action';
import { ThemeToggle } from '@/app/components/theme-toggle';

// Defense in depth alongside proxy.ts, mirroring app/(dashboard)/layout.tsx's
// ADMIN check — this is the DELIVERY_AGENT-scoped counterpart per
// specs/delivery/tasks.md's decision to reuse the admin-web login rather than
// building a separate app for the minimal agent view.
export default async function DeliveryLayout({ children }: { children: ReactNode }) {
  const session = await getSession();
  if (!session || session.role !== 'DELIVERY_AGENT') {
    redirect('/login');
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b border-gray-200 px-6 py-3 dark:border-gray-800">
        <span className="text-sm font-medium">My Deliveries</span>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <form action={logoutAction} className="flex items-center gap-3">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {session.phone_number}
            </span>
            <button type="submit" className="text-sm underline">
              Log out
            </button>
          </form>
        </div>
      </header>
      <main className="flex-1 px-6 py-6">{children}</main>
    </div>
  );
}
