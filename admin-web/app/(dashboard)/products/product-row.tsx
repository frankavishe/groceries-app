'use client';

import Link from 'next/link';
import { useTransition } from 'react';
import type { Category, Product } from '@/lib/types';
import { setProductAvailableAction } from './actions';

export function ProductRow({
  product,
  categories,
}: {
  product: Product;
  categories: Category[];
}) {
  const [pending, startTransition] = useTransition();
  const category = categories.find((c) => c.id === product.category_id);

  return (
    <tr className="border-b border-gray-100 dark:border-gray-800">
      <td className="py-2">
        {product.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.image_url} alt="" className="h-10 w-10 rounded object-cover" />
        ) : (
          <div className="h-10 w-10 rounded bg-gray-100 dark:bg-gray-800" />
        )}
      </td>
      <td className="py-2">{product.name}</td>
      <td className="py-2">{category?.name ?? '—'}</td>
      <td className="py-2">{product.price.toLocaleString()} TZS</td>
      <td className="py-2">
        <span className={product.stock_quantity === 0 ? 'text-red-600 dark:text-red-400' : undefined}>
          {product.stock_quantity} {product.unit}
        </span>
      </td>
      <td className="py-2">
        <span
          className={`rounded-full px-2 py-0.5 text-xs ${
            product.is_available
              ? 'bg-green-100 text-green-800 dark:bg-green-500/15 dark:text-green-300'
              : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
          }`}
        >
          {product.is_available ? 'Active' : 'Inactive'}
        </span>
      </td>
      <td className="flex gap-3 py-2">
        <Link href={`/products/${product.id}/edit`} className="text-sm underline">
          Edit
        </Link>
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(() =>
              setProductAvailableAction(product.id, !product.is_available),
            )
          }
          className="text-sm underline disabled:opacity-50"
        >
          {product.is_available ? 'Deactivate' : 'Activate'}
        </button>
      </td>
    </tr>
  );
}
