'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

// Req 9: debounced search — a plain GET <form> submits per-keystroke-or-Enter,
// not debounced, so this is the one client component on the catalog page
// (per specs/customer-web/design.md's Catalog section). Updates the `search`
// URL param, which the server-rendered product list re-fetches against.
export function SearchBox({ initialValue }: { initialValue: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(initialValue);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Syncs local input state when the URL's search param changes from
    // outside this component (browser back/forward, a category-chip link
    // clearing it) — not something derivable during render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setValue(initialValue);
  }, [initialValue]);

  function handleChange(next: string) {
    setValue(next);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (next.trim()) {
        params.set('search', next.trim());
      } else {
        params.delete('search');
      }
      params.delete('page');
      router.push(`/?${params.toString()}`);
    }, 400);
  }

  return (
    <input
      type="search"
      value={value}
      onChange={(e) => handleChange(e.target.value)}
      placeholder="Search products"
      className="w-full rounded border border-gray-300 px-3 py-2 outline-none focus:border-black dark:border-gray-700 dark:focus:border-white"
    />
  );
}
