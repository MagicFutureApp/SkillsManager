/** Minimum search query length accepted upstream. */
export const SEARCH_MIN_QUERY_LENGTH = 2;
/** Upper bound to reject pathological queries; skills.sh has no documented maximum. */
export const SEARCH_MAX_QUERY_LENGTH = 200;
/** Inclusive lower bound for the result `limit`. */
export const SEARCH_MIN_LIMIT = 1;
/** Hard upstream ceiling documented by skills.sh. */
export const SEARCH_MAX_LIMIT = 200;
/** Default `limit` when the caller omits it. */
export const SEARCH_DEFAULT_LIMIT = 50;

const SEARCH_OWNER_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/;

/**
 * Trim and collapse internal whitespace so `"  react   native "` and
 * `"react native"` agree. Shared by local validation, the result cache key and
 * the outgoing URL so all three always agree on "the same query".
 *
 * Migrated from the desktop `catalog-http.ts` (`normalizeSearchQuery`) and
 * cache-manager `search-query.ts` (`normalizeSearchQueryText`) — identical impls.
 */
export function normalizeSearchQuery(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

/** Validate a GitHub-style owner segment. */
export function isValidSearchOwner(owner: string): boolean {
  return SEARCH_OWNER_PATTERN.test(owner);
}
