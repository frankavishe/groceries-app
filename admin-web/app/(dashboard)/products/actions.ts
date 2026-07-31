'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { apiFetch, ApiError } from '@/lib/api';
import type { Product } from '@/lib/types';

export interface ProductFormState {
  error?: string;
}

function parseProductFields(formData: FormData) {
  const name = String(formData.get('name') ?? '').trim();
  const priceRaw = String(formData.get('price') ?? '');
  const unit = String(formData.get('unit') ?? '').trim();
  const description = String(formData.get('description') ?? '').trim();
  const categoryIdRaw = String(formData.get('category_id') ?? '');
  const stockRaw = String(formData.get('stock_quantity') ?? '');

  if (!name || !unit || priceRaw === '') {
    return { error: 'Name, price, and unit are required.' } as const;
  }
  const price = Number(priceRaw);
  if (Number.isNaN(price) || price < 0) {
    return { error: 'Price must be a non-negative number.' } as const;
  }

  return {
    body: {
      name,
      unit,
      price,
      description: description || undefined,
      category_id: categoryIdRaw ? Number(categoryIdRaw) : undefined,
      stock_quantity: stockRaw ? Number(stockRaw) : undefined,
    },
  } as const;
}

async function uploadImageIfPresent(id: string, formData: FormData) {
  const file = formData.get('image');
  if (file instanceof File && file.size > 0) {
    const uploadForm = new FormData();
    uploadForm.set('file', file);
    await apiFetch<Product>(`/products/${id}/image`, {
      method: 'POST',
      body: uploadForm,
    });
  }
}

// Req 4: create, then send the admin to the edit page to attach an image
// (the upload endpoint requires an existing product id).
export async function createProductAction(
  _prevState: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  const parsed = parseProductFields(formData);
  if ('error' in parsed) return { error: parsed.error };

  let product: Product;
  try {
    product = await apiFetch<Product>('/products', {
      method: 'POST',
      body: parsed.body,
    });
  } catch (err) {
    if (err instanceof ApiError) return { error: err.message };
    throw err;
  }

  revalidatePath('/products');
  redirect(`/products/${product.id}/edit`);
}

// Req 4: edit (fields + optional image replace).
export async function updateProductAction(
  id: string,
  _prevState: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  const parsed = parseProductFields(formData);
  if ('error' in parsed) return { error: parsed.error };

  try {
    await apiFetch<Product>(`/products/${id}`, {
      method: 'PATCH',
      body: parsed.body,
    });
    await uploadImageIfPresent(id, formData);
  } catch (err) {
    if (err instanceof ApiError) return { error: err.message };
    throw err;
  }

  revalidatePath('/products');
  revalidatePath(`/products/${id}/edit`);
  return {};
}

// Req 4: deactivate/re-activate.
export async function setProductAvailableAction(id: string, isAvailable: boolean) {
  await apiFetch<Product>(`/products/${id}`, {
    method: 'PATCH',
    body: { is_available: isAvailable },
  });
  revalidatePath('/products');
}
