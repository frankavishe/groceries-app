import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { CartProvider } from '@/app/components/cart-provider';
import { TopNav } from '@/app/components/top-nav';

// Defense in depth alongside proxy.ts (Req 6): proxy.ts is the route-level
// gate, this is a render-time check so a page never renders shop data for an
// unauthenticated session even if proxy.ts's matcher were ever bypassed —
// same pattern as admin-web/app/(dashboard)/layout.tsx.
export default async function ShopLayout({ children }: { children: ReactNode }) {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }

  return (
    <CartProvider>
      <div className="flex min-h-screen flex-col">
        <TopNav phoneNumber={session.phone_number} />
        <main className="flex-1 px-4 py-6 pb-20 sm:px-6 sm:pb-6">{children}</main>
      </div>
    </CartProvider>
  );
}
