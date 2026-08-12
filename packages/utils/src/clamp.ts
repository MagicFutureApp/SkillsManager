/**
 * Constrain `value` to the inclusive range [min, max].
 *
 * Duplicated across the desktop (`catalog-http.ts`) and cache-manager
 * (`search-query.ts`); centralized here as a shared primitive.
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
