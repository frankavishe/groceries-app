import { ValueTransformer } from 'typeorm';

// pg returns NUMERIC columns as strings to avoid silent precision loss;
// this project's amounts are small enough (TZS, 2 decimal places) that a
// plain JS number stays exact, and callers get a nicer type than a string.
export const numericTransformer: ValueTransformer = {
  to: (value?: number) => value,
  from: (value?: string | null) =>
    value === null || value === undefined ? value : parseFloat(value),
};
