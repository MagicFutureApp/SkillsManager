import type { TFunction } from "i18next";
import type { CatalogSkill } from "@/global";

/**
 * Resolve the display label for a skill source type.
 *
 * The wire value uses a hyphen (`"well-known"`) while the i18n key uses an
 * underscore (`well_known`), so the mapping must stay explicit — building the
 * key by interpolation would produce a missing key that i18next silently
 * renders as the raw key string.
 */
export function sourceTypeLabel(t: TFunction, sourceType: CatalogSkill["sourceType"]): string {
  return sourceType === "github" ? t("discover.sourceType.github") : t("discover.sourceType.well_known");
}

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
