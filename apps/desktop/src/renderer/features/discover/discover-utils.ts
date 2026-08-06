/**
 * Format a count to compact display, e.g. 164300 → "164.3k", 2396488 → "2.4M".
 * Values below one thousand are returned as-is.
 */
export function formatCompact(count: number): string {
  if (count >= 1_000_000) {
    return `${(count / 1_000_000).toFixed(1)}M`;
  }
  if (count >= 1_000) {
    return `${(count / 1_000).toFixed(1)}k`;
  }
  return count.toString();
}
