'use client';

import { useActionState, useState } from 'react';
import type { Category, Product } from '@/lib/types';
import { createProductAction, updateProductAction, type ProductFormState } from './actions';

const initialState: ProductFormState = {};

export function ProductForm({
  product,
  categories,
}: {
  product?: Product;
  categories: Category[];
}) {
  const action = product ? updateProductAction.bind(null, product.id) : createProductAction;
  const [state, formAction, pending] = useActionState(action, initialState);
  const [preview, setPreview] = useState<string | null>(product?.image_url ?? null);
  // A successful save returns a fresh `{}` object (revalidatePath re-renders
  // this route with the saved data in the same response), so identity change
  // away from the initial state is enough to know the last submit succeeded
  // — no effect/timer needed.
  const saved = !pending && state !== initialState && !state.error;

  return (
    <form
      action={formAction}
      className="flex max-w-xl flex-col gap-4"
    >
      <label className="flex flex-col gap-1 text-sm">
        Name
        <input
          name="name"
          type="text"
          required
          defaultValue={product?.name}
          className="rounded border border-gray-300 px-3 py-2 outline-none focus:border-black"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Description
        <textarea
          name="description"
          defaultValue={product?.description ?? ''}
          rows={3}
          className="rounded border border-gray-300 px-3 py-2 outline-none focus:border-black"
        />
      </label>
      <div className="flex gap-4">
        <label className="flex flex-1 flex-col gap-1 text-sm">
          Price (TZS)
          <input
            name="price"
            type="number"
            min="0"
            step="0.01"
            required
            defaultValue={product?.price}
            className="rounded border border-gray-300 px-3 py-2 outline-none focus:border-black"
          />
        </label>
        <label className="flex flex-1 flex-col gap-1 text-sm">
          Unit
          <input
            name="unit"
            type="text"
            required
            placeholder="kg, pack, bunch…"
            defaultValue={product?.unit}
            className="rounded border border-gray-300 px-3 py-2 outline-none focus:border-black"
          />
        </label>
      </div>
      <div className="flex gap-4">
        <label className="flex flex-1 flex-col gap-1 text-sm">
          Category
          <select
            name="category_id"
            defaultValue={product?.category_id ?? ''}
            className="rounded border border-gray-300 px-3 py-2 outline-none focus:border-black"
          >
            <option value="">No category</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-1 flex-col gap-1 text-sm">
          Stock quantity
          <input
            name="stock_quantity"
            type="number"
            min="0"
            step="1"
            defaultValue={product?.stock_quantity}
            className="rounded border border-gray-300 px-3 py-2 outline-none focus:border-black"
          />
        </label>
      </div>
      {product && (
        <label className="flex flex-col gap-1 text-sm">
          Image
          <input
            name="image"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={(e) => {
              const file = e.target.files?.[0];
              setPreview(file ? URL.createObjectURL(file) : (product.image_url ?? null));
            }}
            className="text-sm"
          />
          {preview && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="" className="mt-2 h-24 w-24 rounded object-cover" />
          )}
        </label>
      )}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="w-fit rounded bg-black px-4 py-2 text-sm text-white disabled:opacity-50"
        >
          {pending ? 'Saving…' : product ? 'Save changes' : 'Create product'}
        </button>
        {saved && <span className="text-sm text-green-700">Saved.</span>}
      </div>
      {state?.error && (
        <p role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
      )}
      {!product && (
        <p className="text-sm text-gray-500">
          You&apos;ll be able to upload an image after creating the product.
        </p>
      )}
    </form>
  );
}
