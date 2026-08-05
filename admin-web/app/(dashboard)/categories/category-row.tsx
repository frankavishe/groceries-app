'use client';

import { useState, useTransition } from 'react';
import type { Category } from '@/lib/types';
import { setCategoryActiveAction } from './actions';
import { CategoryForm } from './category-form';

export function CategoryRow({ category }: { category: Category }) {
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();

  if (editing) {
    return (
      <tr>
        <td colSpan={4} className="py-2">
          <CategoryForm category={category} onDone={() => setEditing(false)} />
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-b border-gray-100 dark:border-gray-800">
      <td className="py-2">
        {category.icon_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={category.icon_url} alt="" className="h-8 w-8 rounded object-cover" />
        ) : (
          <div className="h-8 w-8 rounded bg-gray-100 dark:bg-gray-800" />
        )}
      </td>
      <td className="py-2">{category.name}</td>
      <td className="py-2">
        <span
          className={`rounded-full px-2 py-0.5 text-xs ${
            category.is_active
              ? 'bg-green-100 text-green-800 dark:bg-green-500/15 dark:text-green-300'
              : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
          }`}
        >
          {category.is_active ? 'Active' : 'Inactive'}
        </span>
      </td>
      <td className="flex gap-3 py-2">
        <button type="button" onClick={() => setEditing(true)} className="text-sm underline">
          Edit
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(() => setCategoryActiveAction(category.id, !category.is_active))
          }
          className="text-sm underline disabled:opacity-50"
        >
          {category.is_active ? 'Deactivate' : 'Activate'}
        </button>
      </td>
    </tr>
  );
}
