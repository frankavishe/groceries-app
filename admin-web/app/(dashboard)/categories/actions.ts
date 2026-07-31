'use server';

import { revalidatePath } from 'next/cache';
import { apiFetch, ApiError } from '@/lib/api';
import type { Category } from '@/lib/types';

export interface CategoryFormState {
  error?: string;
}

async function uploadIconIfPresent(id: number, formData: FormData) {
  const file = formData.get('icon');
  if (file instanceof File && file.size > 0) {
    const uploadForm = new FormData();
    uploadForm.set('file', file);
    await apiFetch<Category>(`/categories/${id}/icon`, {
      method: 'POST',
      body: uploadForm,
    });
  }
}

// Req 3: create.
export async function createCategoryAction(
  _prevState: CategoryFormState,
  formData: FormData,
): Promise<CategoryFormState> {
  const name = String(formData.get('name') ?? '').trim();
  if (!name) {
    return { error: 'Name is required.' };
  }

  try {
    const category = await apiFetch<Category>('/categories', {
      method: 'POST',
      body: { name },
    });
    await uploadIconIfPresent(category.id, formData);
  } catch (err) {
    if (err instanceof ApiError) return { error: err.message };
    throw err;
  }

  revalidatePath('/categories');
  return {};
}

// Req 3: edit (name + optional icon replace).
export async function updateCategoryAction(
  id: number,
  _prevState: CategoryFormState,
  formData: FormData,
): Promise<CategoryFormState> {
  const name = String(formData.get('name') ?? '').trim();
  if (!name) {
    return { error: 'Name is required.' };
  }

  try {
    await apiFetch<Category>(`/categories/${id}`, {
      method: 'PATCH',
      body: { name },
    });
    await uploadIconIfPresent(id, formData);
  } catch (err) {
    if (err instanceof ApiError) return { error: err.message };
    throw err;
  }

  revalidatePath('/categories');
  return {};
}

// Req 3: deactivate/re-activate — soft delete only, per
// specs/categories/design.md (no hard-delete endpoint).
export async function setCategoryActiveAction(id: number, isActive: boolean) {
  await apiFetch<Category>(`/categories/${id}`, {
    method: 'PATCH',
    body: { is_active: isActive },
  });
  revalidatePath('/categories');
}
