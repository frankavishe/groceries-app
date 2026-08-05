import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import type { Category, Paginated, Product } from '@/lib/types';
import { ProductRow } from './product-row';

const LOW_STOCK_THRESHOLD = 10;

interface ProductsPageProps {
  searchParams: Promise<{
    page?: string;
    search?: string;
    category_id?: string;
    view?: string;
  }>;
}

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const params = await searchParams;
  const isLowStock = params.view === 'low-stock';
  const page = Number(params.page ?? '1') || 1;

  const categories = await apiFetch<Category[]>('/categories/admin');

  let products: Product[];
  let total = 0;
  let pageSize = 20;

  if (isLowStock) {
    products = await apiFetch<Product[]>(
      `/products/low-stock?threshold=${LOW_STOCK_THRESHOLD}`,
    );
    total = products.length;
  } else {
    const query = new URLSearchParams({ page: String(page), pageSize: '20' });
    if (params.search) query.set('search', params.search);
    if (params.category_id) query.set('category_id', params.category_id);
    const result = await apiFetch<Paginated<Product>>(`/products/admin?${query}`);
    products = result.data;
    total = result.total;
    pageSize = result.pageSize;
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Products</h1>
        <Link
          href="/products/new"
          className="rounded bg-black px-4 py-2 text-sm text-white dark:bg-white dark:text-black"
        >
          Add product
        </Link>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <form className="flex flex-wrap items-end gap-3" method="get">
          <label className="flex flex-col gap-1 text-sm">
            Search
            <input
              name="search"
              type="text"
              defaultValue={params.search}
              placeholder="Product name…"
              className="rounded border border-gray-300 px-3 py-2 outline-none focus:border-black dark:border-gray-700 dark:focus:border-white"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Category
            <select
              name="category_id"
              defaultValue={params.category_id ?? ''}
              className="rounded border border-gray-300 px-3 py-2 outline-none focus:border-black dark:border-gray-700 dark:focus:border-white"
            >
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            className="rounded border border-gray-300 px-4 py-2 text-sm dark:border-gray-700"
          >
            Filter
          </button>
        </form>

        <Link
          href={isLowStock ? '/products' : '/products?view=low-stock'}
          className={`rounded px-4 py-2 text-sm ${
            isLowStock
              ? 'bg-amber-100 text-amber-900 dark:bg-amber-500/15 dark:text-amber-300'
              : 'border border-amber-300 text-amber-800 dark:border-amber-700 dark:text-amber-300'
          }`}
        >
          {isLowStock
            ? '← Back to all products'
            : `Low stock (≤ ${LOW_STOCK_THRESHOLD})`}
        </Link>
      </div>

      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-gray-200 text-sm text-gray-500 dark:border-gray-800 dark:text-gray-400">
            <th className="py-2 font-medium">Image</th>
            <th className="py-2 font-medium">Name</th>
            <th className="py-2 font-medium">Category</th>
            <th className="py-2 font-medium">Price</th>
            <th className="py-2 font-medium">Stock</th>
            <th className="py-2 font-medium">Status</th>
            <th className="py-2 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => (
            <ProductRow key={product.id} product={product} categories={categories} />
          ))}
        </tbody>
      </table>
      {products.length === 0 && (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {isLowStock ? 'No products at or below the low-stock threshold.' : 'No products found.'}
        </p>
      )}

      {!isLowStock && totalPages > 1 && (
        <div className="flex items-center gap-3 text-sm">
          {page > 1 && (
            <Link href={buildPageHref(params, page - 1)} className="underline">
              ← Previous
            </Link>
          )}
          <span className="text-gray-500 dark:text-gray-400">
            Page {page} of {totalPages}
          </span>
          {page < totalPages && (
            <Link href={buildPageHref(params, page + 1)} className="underline">
              Next →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

function buildPageHref(
  params: { search?: string; category_id?: string },
  page: number,
): string {
  const query = new URLSearchParams();
  if (params.search) query.set('search', params.search);
  if (params.category_id) query.set('category_id', params.category_id);
  query.set('page', String(page));
  return `/products?${query}`;
}
