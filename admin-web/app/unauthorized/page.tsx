import Link from 'next/link';

// Req 2: non-ADMIN sessions land here instead of any admin view.
export default function UnauthorizedPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-sm flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-2xl font-semibold">Not authorized</h1>
      <p className="text-sm text-gray-500">
        This account does not have admin access to the dashboard.
      </p>
      <Link href="/login" className="text-sm underline">
        Back to login
      </Link>
    </main>
  );
}
