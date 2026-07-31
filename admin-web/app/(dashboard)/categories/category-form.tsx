'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import type { Category } from '@/lib/types';
import { createCategoryAction, updateCategoryAction, type CategoryFormState } from './actions';

const initialState: CategoryFormState = {};

export function CategoryForm({
  category,
  onDone,
}: {
  category?: Category;
  onDone?: () => void;
}) {
  const action = category
    ? updateCategoryAction.bind(null, category.id)
    : createCategoryAction;
  const [state, formAction, pending] = useActionState(action, initialState);
  const [preview, setPreview] = useState<string | null>(category?.icon_url ?? null);
  const submittedRef = useRef(false);

  useEffect(() => {
    if (submittedRef.current && !pending) {
      submittedRef.current = false;
      if (!state.error) onDone?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, pending]);

  return (
    <form
      action={formAction}
      onSubmit={() => {
        submittedRef.current = true;
      }}
      className="flex flex-wrap items-end gap-3 rounded border border-gray-200 p-4"
    >
      <label className="flex flex-col gap-1 text-sm">
        Name
        <input
          name="name"
          type="text"
          required
          defaultValue={category?.name}
          className="rounded border border-gray-300 px-3 py-2 outline-none focus:border-black"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Icon
        <input
          name="icon"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={(e) => {
            const file = e.target.files?.[0];
            setPreview(file ? URL.createObjectURL(file) : (category?.icon_url ?? null));
          }}
          className="text-sm"
        />
      </label>
      {preview && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={preview} alt="" className="h-10 w-10 rounded object-cover" />
      )}
      <button
        type="submit"
        disabled={pending}
        className="rounded bg-black px-4 py-2 text-sm text-white disabled:opacity-50"
      >
        {pending ? 'Saving…' : category ? 'Save' : 'Add category'}
      </button>
      {onDone && (
        <button type="button" onClick={() => onDone()} className="text-sm underline">
          Cancel
        </button>
      )}
      {state?.error && (
        <p role="alert" className="w-full text-sm text-red-600">
          {state.error}
        </p>
      )}
    </form>
  );
}
