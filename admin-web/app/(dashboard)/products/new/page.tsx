import { apiFetch } from '@/lib/api';
import type { Category } from '@/lib/types';
import { ProductForm } from '../product-form';

export default async function NewProductPage() {
  const categories = await apiFetch<Category[]>('/categories/admin');

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Add product</h1>
      <ProductForm categories={categories} />
    </div>
  );
}
