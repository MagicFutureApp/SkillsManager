import type {
  CatalogErrorCode,
  CatalogManifest,
  CatalogPage,
  CatalogPagination,
  CatalogSearchType,
  CatalogSkill,
  CatalogSnapshot
} from "./catalog-types.js";

/** Fallback used when the server omits or sends a malformed `Retry-After`. */
export const DEFAULT_RETRY_AFTER_SECONDS = 2;
export const MIN_RETRY_AFTER_SECONDS = 1;
export const MAX_RETRY_AFTER_SECONDS = 10;

/** Mirrors the cache-manager guard so a hopeless query never leaves the app. */
export const CATALOG_SEARCH_MIN_QUERY_LENGTH = 2;
export const CATALOG_SEARCH_MAX_QUERY_LENGTH = 200;
export const CATALOG_SEARCH_MIN_LIMIT = 1;
export const CATALOG_SEARCH_MAX_LIMIT = 200;
export const CATALOG_SEARCH_DEFAULT_LIMIT = 50;

const SEARCH_OWNER_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/;

export type CatalogHttpOptions = {
  baseUrl: string;
  fetchImpl: typeof fetch;
  timeoutMs: number;
};

export type CatalogPageHttpOptions = CatalogHttpOptions & {
  generation: string;
  page: number;
};

export type CatalogSearchHttpOptions = CatalogHttpOptions & {
  /** Already trimmed and validated by the client. */
  query: string;
  /** Already clamped to [1, 200] by the client. */
  limit: number;
  owner?: string;
};

/** Transport level shape of a search response, before `truncated` is derived. */
export type CatalogSearchPayload = {
  data: CatalogSkill[];
  query: string;
  searchType: CatalogSearchType;
  count: number;
};

/** Transport-level failure carrying the classification the client state machine branches on. */
export class CatalogHttpError extends Error {
  readonly code: CatalogErrorCode;
  readonly retryAfterSeconds?: number;

  constructor(code: CatalogErrorCode, message: string, retryAfterSeconds?: number) {
    super(message);
    this.name = "CatalogHttpError";
    this.code = code;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export const isCatalogHttpError = (value: unknown): value is CatalogHttpError =>
  value instanceof CatalogHttpError;

/** Strip trailing slashes so URL joins never produce `//v1/catalog`. */
export const normalizeCatalogBaseUrl = (baseUrl: string): string =>
  baseUrl.trim().replace(/\/+$/, "");

export const buildManifestUrl = (baseUrl: string): string =>
  `${normalizeCatalogBaseUrl(baseUrl)}/v1/catalog`;

export const buildPageUrl = (baseUrl: string, generation: string, page: number): string =>
  `${normalizeCatalogBaseUrl(baseUrl)}/v1/catalog/${encodeURIComponent(generation)}/pages/${page}`;

/**
 * Trim and collapse internal whitespace.
 *
 * Shared by the client's local validation, its result cache key and the
 * outgoing URL, so all three always agree on what "the same query" means.
 */
export const normalizeSearchQuery = (value: string): string => value.trim().replace(/\s+/g, " ");

export const isValidSearchOwner = (owner: string): boolean => SEARCH_OWNER_PATTERN.test(owner);

/** Out of range limits are clamped rather than rejected; absent means the default. */
export const resolveSearchLimit = (limit: number | undefined): number => {
  if (limit === undefined || !Number.isFinite(limit)) {
    return CATALOG_SEARCH_DEFAULT_LIMIT;
  }

  return clamp(Math.trunc(limit), CATALOG_SEARCH_MIN_LIMIT, CATALOG_SEARCH_MAX_LIMIT);
};

export const buildSearchUrl = (
  baseUrl: string,
  { query, limit, owner }: { query: string; limit: number; owner?: string }
): string =>
  `${normalizeCatalogBaseUrl(baseUrl)}/v1/catalog/search` +
  `?q=${encodeURIComponent(query)}&limit=${limit}` +
  (owner ? `&owner=${encodeURIComponent(owner)}` : "");

/**
 * Parse the `Retry-After` header. The Worker only emits the delta-seconds form,
 * so anything else falls back to the default. The result is clamped to
 * [1, 10] seconds to keep a single IPC call inside its budget.
 */
export const parseRetryAfterSeconds = (headerValue: string | null): number => {
  const raw = headerValue?.trim() ?? "";

  if (!raw) {
    return DEFAULT_RETRY_AFTER_SECONDS;
  }

  const parsed = Number(raw);

  if (!Number.isFinite(parsed)) {
    return DEFAULT_RETRY_AFTER_SECONDS;
  }

  return clamp(Math.round(parsed), MIN_RETRY_AFTER_SECONDS, MAX_RETRY_AFTER_SECONDS);
};

export const fetchCatalogManifest = async (
  options: CatalogHttpOptions
): Promise<CatalogManifest> => {
  const url = buildManifestUrl(options.baseUrl);
  const response = await performRequest(url, options);

  assertSuccessfulResponse(response, "Catalog manifest");

  return normalizeCatalogManifest(await readJson(response, "Catalog manifest"));
};

export const fetchCatalogPage = async (options: CatalogPageHttpOptions): Promise<CatalogPage> => {
  const url = buildPageUrl(options.baseUrl, options.generation, options.page);
  const response = await performRequest(url, options);

  assertSuccessfulResponse(response, `Catalog page ${options.page}`);

  return normalizeCatalogPage(await readJson(response, `Catalog page ${options.page}`));
};

export const fetchCatalogSearch = async (
  options: CatalogSearchHttpOptions
): Promise<CatalogSearchPayload> => {
  const url = buildSearchUrl(options.baseUrl, options);
  const response = await performRequest(url, options);

  assertSuccessfulResponse(response, "Catalog search");

  return normalizeCatalogSearch(await readJson(response, "Catalog search"));
};

/* ── internals ──────────────────────────────────────────────── */

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

/**
 * `AbortSignal.timeout` is available on Node 18+ / Electron, but jsdom based
 * test environments may not expose it. Degrade to "no timeout" instead of
 * throwing, so the transport stays testable everywhere.
 */
const createTimeoutSignal = (timeoutMs: number): AbortSignal | undefined => {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    return undefined;
  }

  if (typeof AbortSignal === "undefined" || typeof AbortSignal.timeout !== "function") {
    return undefined;
  }

  return AbortSignal.timeout(timeoutMs);
};

const describeError = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const performRequest = async (url: string, options: CatalogHttpOptions): Promise<Response> => {
  try {
    return await options.fetchImpl(url, {
      headers: { Accept: "application/json" },
      signal: createTimeoutSignal(options.timeoutMs)
    });
  } catch (error: unknown) {
    throw new CatalogHttpError(
      "network",
      `Catalog request to ${url} failed: ${describeError(error)}`
    );
  }
};

const assertSuccessfulResponse = (response: Response, context: string): void => {
  if (response.status === 202) {
    throw new CatalogHttpError(
      "warming",
      `${context} is still warming up.`,
      parseRetryAfterSeconds(response.headers.get("retry-after"))
    );
  }

  if (response.status === 400) {
    throw new CatalogHttpError("invalid-query", `${context} rejected the query.`);
  }

  if (response.status === 404) {
    throw new CatalogHttpError("not-found", `${context} was not found.`);
  }

  if (response.status === 429) {
    throw new CatalogHttpError(
      "rate-limited",
      `${context} was rate limited.`,
      parseRetryAfterSeconds(response.headers.get("retry-after"))
    );
  }

  if (response.status === 503) {
    throw new CatalogHttpError("unavailable", `${context} is temporarily unavailable.`);
  }

  if (!response.ok) {
    throw new CatalogHttpError("network", `${context} failed with HTTP ${response.status}.`);
  }
};

const readJson = async (response: Response, context: string): Promise<unknown> => {
  try {
    return (await response.json()) as unknown;
  } catch (error: unknown) {
    throw new CatalogHttpError(
      "invalid-response",
      `${context} returned a malformed JSON body: ${describeError(error)}`
    );
  }
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const toFiniteNumber = (value: unknown, fallback: number): number =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

const toNonNegativeInteger = (value: unknown, fallback: number): number => {
  const parsed = toFiniteNumber(value, fallback);

  return parsed < 0 ? fallback : Math.trunc(parsed);
};

const toStringOrDefault = (value: unknown, fallback: string): string =>
  typeof value === "string" ? value : fallback;

const toNullableString = (value: unknown): string | null =>
  typeof value === "string" && value.length > 0 ? value : null;

const normalizeSourceType = (value: unknown): CatalogSkill["sourceType"] =>
  value === "github" ? "github" : "well-known";

/** cache-manager only hard-validates `id`; every other field is passed through. */
const normalizeCatalogSkill = (value: unknown): CatalogSkill | null => {
  if (!isRecord(value)) {
    return null;
  }

  const id = value.id;

  if (typeof id !== "string" || id.length === 0) {
    return null;
  }

  const skill: CatalogSkill = {
    id,
    slug: toStringOrDefault(value.slug, ""),
    name: toStringOrDefault(value.name, ""),
    source: toStringOrDefault(value.source, ""),
    installs: toNonNegativeInteger(value.installs, 0),
    sourceType: normalizeSourceType(value.sourceType),
    installUrl: toNullableString(value.installUrl),
    url: toStringOrDefault(value.url, "")
  };

  // Upstream omits the flag entirely when false, so only attach it when true.
  // Keeping it absent otherwise means browse payloads stay byte-identical.
  return value.isDuplicate === true ? { ...skill, isDuplicate: true } : skill;
};

const normalizeCatalogPagination = (value: unknown, itemCount: number): CatalogPagination => {
  const source = isRecord(value) ? value : {};

  return {
    page: toNonNegativeInteger(source.page, 0),
    perPage: toNonNegativeInteger(source.perPage, itemCount),
    total: toNonNegativeInteger(source.total, itemCount),
    hasMore: source.hasMore === true
  };
};

export const normalizeCatalogPage = (value: unknown): CatalogPage => {
  if (!isRecord(value) || !Array.isArray(value.data)) {
    throw new CatalogHttpError("invalid-response", "Catalog page payload has an invalid shape.");
  }

  const data = value.data
    .map((entry: unknown) => normalizeCatalogSkill(entry))
    .filter((entry): entry is CatalogSkill => entry !== null);

  return {
    data,
    pagination: normalizeCatalogPagination(value.pagination, data.length)
  };
};

/** Anything that is not exactly `"fuzzy"` is treated as semantic rather than throwing. */
const normalizeSearchType = (value: unknown): CatalogSearchType =>
  value === "fuzzy" ? "fuzzy" : "semantic";

/**
 * `count` is derived from the entries that survived normalization instead of
 * trusting the server field, so `count` and `skills.length` can never disagree
 * in the UI (and `truncated` stays meaningful).
 */
export const normalizeCatalogSearch = (value: unknown): CatalogSearchPayload => {
  if (!isRecord(value) || !Array.isArray(value.data)) {
    throw new CatalogHttpError("invalid-response", "Catalog search payload has an invalid shape.");
  }

  const data = value.data
    .map((entry: unknown) => normalizeCatalogSkill(entry))
    .filter((entry): entry is CatalogSkill => entry !== null);

  return {
    data,
    query: toStringOrDefault(value.query, ""),
    searchType: normalizeSearchType(value.searchType),
    count: data.length
  };
};

const normalizeCatalogSnapshot = (value: unknown): CatalogSnapshot | null => {
  if (!isRecord(value)) {
    return null;
  }

  const generation = value.generation;

  if (typeof generation !== "string" || generation.length === 0) {
    return null;
  }

  return {
    generation,
    generatedAt: toStringOrDefault(value.generatedAt, ""),
    pageCount: toNonNegativeInteger(value.pageCount, 0),
    perPage: toNonNegativeInteger(value.perPage, 0),
    total: toNonNegativeInteger(value.total, 0),
    view: "all-time"
  };
};

export const normalizeCatalogManifest = (value: unknown): CatalogManifest => {
  if (!isRecord(value)) {
    throw new CatalogHttpError(
      "invalid-response",
      "Catalog manifest payload has an invalid shape."
    );
  }

  const current = normalizeCatalogSnapshot(value.current);

  if (!current) {
    throw new CatalogHttpError(
      "invalid-response",
      "Catalog manifest is missing a usable current generation."
    );
  }

  const previous = normalizeCatalogSnapshot(value.previous);

  return previous ? { schemaVersion: 1, current, previous } : { schemaVersion: 1, current };
};
