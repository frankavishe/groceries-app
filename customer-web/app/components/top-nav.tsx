'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { logoutAction } from '@/app/logout-action';
import { useCart } from './cart-provider';

const NAV_ITEMS = [
  { href: '/', label: 'Shop' },
  { href: '/cart', label: 'Cart' },
  { href: '/orders', label: 'Orders' },
];

function isActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

// Mirrors mobile-app's HomeShell (Shop/Cart/Orders tabs + cart-count badge):
// a header on wide viewports, collapsing to a fixed bottom bar on narrow
// ones, per specs/customer-web/design.md's shared-nav section. Pure Tailwind
// breakpoint toggle — both markup blocks render, no client-side media query.
export function TopNav({ phoneNumber }: { phoneNumber: string }) {
  const pathname = usePathname();
  const { itemCount } = useCart();

  return (
    <>
      <header className="hidden items-center justify-between border-b border-gray-200 px-6 py-3 sm:flex dark:border-gray-800">
        <div className="flex items-center gap-1">
          <span className="mr-4 text-lg font-semibold">Groceries</span>
          <nav className="flex items-center gap-1">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`relative rounded px-3 py-2 text-sm font-medium ${
                  isActive(pathname, item.href)
                    ? 'bg-black text-white dark:bg-white dark:text-black'
                    : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
                }`}
              >
                {item.label}
                {item.href === '/cart' && itemCount > 0 && (
                  <span className="ml-1.5 rounded-full bg-red-600 px-1.5 py-0.5 text-xs text-white">
                    {itemCount}
                  </span>
                )}
              </Link>
            ))}
          </nav>
        </div>
        <form action={logoutAction} className="flex items-center gap-3">
          <span className="text-sm text-gray-500 dark:text-gray-400">{phoneNumber}</span>
          <button type="submit" className="text-sm underline">
            Log out
          </button>
        </form>
      </header>

      <header className="flex items-center justify-between border-b border-gray-200 px-4 py-3 sm:hidden dark:border-gray-800">
        <span className="text-lg font-semibold">Groceries</span>
        <form action={logoutAction}>
          <button type="submit" className="text-sm underline">
            Log out
          </button>
        </form>
      </header>

      <nav className="fixed inset-x-0 bottom-0 z-10 flex border-t border-gray-200 bg-[var(--background)] sm:hidden dark:border-gray-800">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`relative flex flex-1 flex-col items-center gap-0.5 py-2 text-xs font-medium ${
              isActive(pathname, item.href)
                ? 'text-black dark:text-white'
                : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            {item.label}
            {item.href === '/cart' && itemCount > 0 && (
              <span className="absolute top-0.5 right-[calc(50%-1.75rem)] rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] text-white">
                {itemCount}
              </span>
            )}
          </Link>
        ))}
      </nav>
    </>
  );
}
