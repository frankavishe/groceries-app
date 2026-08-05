import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { NavLink } from './nav-link';
import { logoutAction } from '../logout-action';
import { ThemeToggle } from '@/app/components/theme-toggle';

// Defense in depth alongside proxy.ts (Req 2): proxy.ts is the route-level
// gate, this is a render-time check so a page never renders admin data for a
// non-admin session even if proxy.ts's matcher were ever bypassed.
export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') {
    redirect('/login');
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b border-gray-200 px-6 py-3 dark:border-gray-800">
        <nav className="flex items-center gap-1">
          <NavLink href="/categories">Categories</NavLink>
          <NavLink href="/products">Products</NavLink>
          <NavLink href="/orders">Orders</NavLink>
          <NavLink href="/transactions">Transactions</NavLink>
        </nav>
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
