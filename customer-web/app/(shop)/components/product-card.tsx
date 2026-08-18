'use client';

import { useCart } from '@/app/components/cart-provider';
import { formatTzs } from '@/lib/format';
import type { Product } from '@/lib/types';

// Req 11: disable add-to-cart when the product is out of stock.
export function ProductCard({ product }: { product: Product }) {
  const { addItem } = useCart();

  return (
    <div className="flex flex-col overflow-hidden rounded border border-gray-200 dark:border-gray-800">
      <div className="flex aspect-square items-center justify-center bg-gray-100 dark:bg-gray-900">
        {product.image_url ? (
          // External backend-hosted image, not worth Next's Image pipeline here.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.image_url}
            alt={product.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="text-3xl text-gray-400 dark:text-gray-600">🛒</span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <p className="text-sm font-medium">{product.name}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">{product.unit}</p>
        <p className="text-sm font-semibold">{formatTzs(product.price)}</p>
        <button
          type="button"
          disabled={!product.in_stock}
          onClick={() => addItem(product)}
          className="mt-auto rounded bg-black px-3 py-1.5 text-sm text-white disabled:cursor-not-allowed disabled:opacity-40 dark:bg-white dark:text-black"
        >
          {product.in_stock ? 'Add to cart' : 'Out of stock'}
        </button>
      </div>
    </div>
  );
}
