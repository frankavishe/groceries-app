import Link from 'next/link';
import { Suspense } from 'react';
import { apiFetch } from '@/lib/api';
import type { Category, Paginated, Product } from '@/lib/types';
import { ProductCard } from './components/product-card';
import { SearchBox } from './components/search-box';

interface ShopPageProps {
  searchParams: Promise<{ search?: string; category_id?: string; page?: string }>;
}

// Req 8-10: server-fetched, searchParams-driven catalog — same
// fetch-then-render-with-filters pattern as admin-web's order list, per
// specs/customer-web/design.md's Catalog section.
export default async function ShopPage({ searchParams }: ShopPageProps) {
  const params = await searchParams;
  const page = Number(params.page ?? '1') || 1;

  const query = new URLSearchParams({ page: String(page), pageSize: '20' });
  if (params.search) query.set('search', params.search);
  if (params.category_id) query.set('category_id', params.category_id);

  const [categories, products] = await Promise.all([
    apiFetch<Category[]>('/categories'),
    apiFetch<Paginated<Product>>(`/products?${query}`),
  ]);

  const totalPages = Math.max(1, Math.ceil(products.total / products.pageSize));

  return (
    <div className="flex flex-col gap-4">
      <Suspense>
        <SearchBox initialValue={params.search ?? ''} />
      </Suspense>

      <div className="flex gap-2 overflow-x-auto pb-1">
        <CategoryChip
          label="All"
          href={buildFilterHref(params, { category_id: undefined })}
          active={!params.category_id}
        />
        {categories.map((category) => (
          <CategoryChip
            key={category.id}
            label={category.name}
            href={buildFilterHref(params, { category_id: String(category.id) })}
            active={params.category_id === String(category.id)}
          />
        ))}
      </div>

      {products.data.length === 0 ? (
        <p className="py-16 text-center text-sm text-gray-500 dark:text-gray-400">
          No products found.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {products.data.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 py-4 text-sm">
          {page > 1 && (
            <Link href={buildFilterHref(params, { page: String(page - 1) })} className="underline">
              ← Previous
            </Link>
          )}
          <span className="text-gray-500 dark:text-gray-400">
            Page {page} of {totalPages}
          </span>
          {page < totalPages && (
            <Link href={buildFilterHref(params, { page: String(page + 1) })} className="underline">
              Next →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

function CategoryChip({ label, href, active }: { label: string; href: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={`shrink-0 rounded-full px-3 py-1.5 text-sm ${
        active
          ? 'bg-black text-white dark:bg-white dark:text-black'
          : 'border border-gray-300 text-gray-700 dark:border-gray-700 dark:text-gray-300'
      }`}
    >
      {label}
    </Link>
  );
}

function buildFilterHref(
  params: { search?: string; category_id?: string },
  overrides: { category_id?: string; page?: string },
): string {
  const query = new URLSearchParams();
  if (params.search) query.set('search', params.search);
  const categoryId = 'category_id' in overrides ? overrides.category_id : params.category_id;
  if (categoryId) query.set('category_id', categoryId);
  if (overrides.page) query.set('page', overrides.page);
  const qs = query.toString();
  return qs ? `/?${qs}` : '/';
}
