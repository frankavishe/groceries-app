import Link from 'next/link';

// Req 2: sessions without access to the route they requested land here —
// non-ADMIN visiting an admin route, or non-DELIVERY_AGENT visiting /delivery
// (specs/delivery/tasks.md's role-scoped reuse of this same login).
export default function UnauthorizedPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-sm flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-2xl font-semibold">Not authorized</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400">
        This account does not have access to this part of the dashboard.
      </p>
      <Link href="/login" className="text-sm underline">
        Back to login
      </Link>
    </main>
  );
}
