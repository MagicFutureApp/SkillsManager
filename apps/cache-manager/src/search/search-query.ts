/**
 * Pure helpers for the `GET /v1/catalog/search` route: request validation,
 * upstream URL construction, canonical cache keys and response projection.
 *
 * Everything here is side-effect free so it can be unit tested without a
 * Worker runtime.
 *
 * The validation primitives (query normalization, owner pattern, limits,
 * `clamp`/`isRecord`) now come from the shared `@skills-manager/utils` package
 * so desktop and cache-manager agree on one definition. The *error codes*
 * (`invalid_query` / `invalid_limit` / `invalid_owner`) stay local — they are
 * part of this Worker's public contract and are intentionally not unified.
 */
import {
  clamp,
  isRecord,
  isValidSearchOwner,
  normalizeSearchQuery,
  SEARCH_MIN_QUERY_LENGTH,
  SEARCH_MAX_QUERY_LENGTH,
  SEARCH_MIN_LIMIT,
  SEARCH_MAX_LIMIT,
  SEARCH_DEFAULT_LIMIT,
} from "@skills-manager/utils";

export const searchMinQueryLength = SEARCH_MIN_QUERY_LENGTH;
export const searchMaxQueryLength = SEARCH_MAX_QUERY_LENGTH;
export const searchMinLimit = SEARCH_MIN_LIMIT;
export const searchMaxLimit = SEARCH_MAX_LIMIT;
export const searchDefaultLimit = SEARCH_DEFAULT_LIMIT;
export const normalizeSearchQueryText = normalizeSearchQuery;

const ownerPattern = /^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/;
const integerPattern = /^[+-]?\d+$/;

export type SearchQueryParams = {
  /** Trimmed and whitespace-collapsed query. Case is preserved for the upstream call. */
  query: string;
  /** Already clamped to [1, 200]. */
  limit: number;
  /** Lower-cased GitHub owner, omitted when the caller did not filter. */
  owner?: string;
};

export type SearchQueryErrorCode = "invalid_query" | "invalid_limit" | "invalid_owner";

export type SearchQueryParseResult =
  | { ok: true; params: SearchQueryParams }
  | { ok: false; code: SearchQueryErrorCode; message: string };

export type SearchProjection = {
  data: Record<string, unknown>[];
  query: string;
  searchType: "fuzzy" | "semantic";
  count: number;
};

const parseLimit = (raw: string | null): number | null => {
  if (raw === null || raw.trim() === "") {
    return searchDefaultLimit;
  }

  const trimmed = raw.trim();

  if (!integerPattern.test(trimmed)) {
    return null;
  }

  const parsed = Number(trimmed);

  if (!Number.isSafeInteger(parsed)) {
    return null;
  }

  return clamp(parsed, searchMinLimit, searchMaxLimit);
};

/**
 * Validate the incoming query string.
 *
 * Rejections happen before any upstream call so a malformed request never
 * spends part of the shared skills.sh rate limit.
 */
export const parseSearchQuery = (params: URLSearchParams): SearchQueryParseResult => {
  const query = normalizeSearchQueryText(params.get("q") ?? "");

  if (query.length < searchMinQueryLength || query.length > searchMaxQueryLength) {
    return {
      ok: false,
      code: "invalid_query",
      message: `The "q" parameter must be between ${searchMinQueryLength} and ${searchMaxQueryLength} characters.`
    };
  }

  const limit = parseLimit(params.get("limit"));

  if (limit === null) {
    return {
      ok: false,
      code: "invalid_limit",
      message: 'The "limit" parameter must be an integer.'
    };
  }

  const rawOwner = params.get("owner");
  const owner = rawOwner === null || rawOwner.trim() === "" ? undefined : rawOwner.trim();

  if (owner !== undefined && !isValidSearchOwner(owner)) {
    return {
      ok: false,
      code: "invalid_owner",
      message: 'The "owner" parameter must be a valid GitHub owner.'
    };
  }

  return {
    ok: true,
    params: owner === undefined ? { query, limit } : { query, limit, owner: owner.toLowerCase() }
  };
};

export const buildSkillsShSearchUrl = (params: SearchQueryParams): string => {
  const search = [`q=${encodeURIComponent(params.query)}`, `limit=${params.limit}`];

  if (params.owner) {
    search.push(`owner=${encodeURIComponent(params.owner)}`);
  }

  return `https://skills.sh/api/v1/skills/search?${search.join("&")}`;
};

/**
 * Canonical Workers Cache key.
 *
 * The Cache API keys on the full URL, so `?q=React` and `?q=%20react%20`
 * would otherwise occupy two entries. Every parameter is written in a fixed
 * order, lower-cased and never omitted.
 */
export const buildSearchCacheKey = (params: SearchQueryParams): string =>
  "https://cache.internal/v1/catalog/search" +
  `?q=${encodeURIComponent(params.query.toLowerCase())}` +
  `&limit=${params.limit}` +
  `&owner=${encodeURIComponent(params.owner ?? "")}`;

/**
 * Validate the upstream body and re-serialize only the client contract.
 *
 * `durationMs` is dropped: it is upstream timing noise and would make every
 * cached body differ. Entries without a usable `id` are discarded, mirroring
 * the desktop normalizer.
 */
export const projectSearchBody = (body: string, params: SearchQueryParams): string | null => {
  let parsed: unknown;

  try {
    parsed = JSON.parse(body);
  } catch {
    return null;
  }

  if (!isRecord(parsed) || !Array.isArray(parsed.data)) {
    return null;
  }

  const searchType = parsed.searchType;

  if (searchType !== "fuzzy" && searchType !== "semantic") {
    return null;
  }

  const data = parsed.data.filter(
    (entry: unknown): entry is Record<string, unknown> =>
      isRecord(entry) && typeof entry.id === "string" && entry.id.length > 0
  );

  const projection: SearchProjection = {
    data,
    query: typeof parsed.query === "string" ? parsed.query : params.query,
    searchType,
    count: data.length
  };

  return JSON.stringify(projection);
};
