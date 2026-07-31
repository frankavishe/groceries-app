import { notFound } from 'next/navigation';
import { apiFetch, ApiError } from '@/lib/api';
import type { Category, Product } from '@/lib/types';
import { ProductForm } from '../../product-form';

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const categories = await apiFetch<Category[]>('/categories/admin');

  let product: Product;
  try {
    product = await apiFetch<Product>(`/products/${id}`);
  } catch (err) {
    // A malformed id (not a valid UUID) fails the backend's ParseUUIDPipe
    // with 400 before it ever gets a chance to 404 — both mean "no such
    // product to show" from this page's perspective.
    if (err instanceof ApiError && (err.status === 404 || err.status === 400)) notFound();
    throw err;
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Edit product</h1>
      <ProductForm product={product} categories={categories} />
    </div>
  );
}
