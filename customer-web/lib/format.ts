// Mirrors mobile-app/lib/core/formatting.dart's formatTzs: whole-shilling
// amounts (no decimal subunit, per specs/constitution.md's Currency
// invariant), grouped with commas, prefixed with a literal "TZS " rather
// than relying on Intl's currency-code formatting (TZS has no reliable
// built-in symbol across environments).
export function formatTzs(amount: number): string {
  return `TZS ${new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
  }).format(amount)}`;
}
