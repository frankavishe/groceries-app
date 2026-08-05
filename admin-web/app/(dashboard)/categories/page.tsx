import { apiFetch } from '@/lib/api';
import type { Category } from '@/lib/types';
import { CategoryForm } from './category-form';
import { CategoryRow } from './category-row';

export default async function CategoriesPage() {
  const categories = await apiFetch<Category[]>('/categories/admin');

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Categories</h1>
      <CategoryForm />
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-gray-200 text-sm text-gray-500 dark:border-gray-800 dark:text-gray-400">
            <th className="py-2 font-medium">Icon</th>
            <th className="py-2 font-medium">Name</th>
            <th className="py-2 font-medium">Status</th>
            <th className="py-2 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {categories.map((category) => (
            <CategoryRow key={category.id} category={category} />
          ))}
        </tbody>
      </table>
      {categories.length === 0 && (
        <p className="text-sm text-gray-500 dark:text-gray-400">No categories yet.</p>
      )}
    </div>
  );
}
