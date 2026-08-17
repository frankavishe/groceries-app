'use client';

export default function OrdersError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex flex-col items-center gap-4 py-24 text-center">
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Something went wrong loading your orders.
      </p>
      <button
        type="button"
        onClick={reset}
        className="rounded border border-gray-300 px-4 py-2 text-sm dark:border-gray-700"
      >
        Try again
      </button>
    </div>
  );
}
