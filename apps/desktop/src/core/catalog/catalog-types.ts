/**
 * Catalog contract types shared across main, preload and renderer.
 *
 * HARD CONSTRAINT: this module must stay **zero runtime** — no imports, no
 * values, no Node/Electron/DOM APIs. It is the only catalog module the renderer
 * is allowed to reference (through `renderer/global.d.ts`), and it is pulled
 * into the renderer TypeScript program. Anything with `fetch` lives in
 * `catalog-http.ts` / `catalog-client.ts`, which the renderer never imports.
 */

/** A single skill entry as served by the cache-manager catalog API. */
export type CatalogSkill = {
  id: string;
  slug: string;
  name: string;
  source: string;
  installs: number;
  sourceType: "github" | "well-known";
  installUrl: string | null;
  url: string;
  /**
   * True when upstream flagged this skill as a detected fork/copy of another.
   * Upstream omits the field when false, so it is optional here too. Search
   * results surface duplicates far more often than browse pages do; the value
   * is carried through for future filtering but is not acted on yet.
   */
  isDuplicate?: boolean;
};

/** Pagination envelope returned with every catalog page. */
export type CatalogPagination = {
  page: number;
  perPage: number;
  total: number;
  hasMore: boolean;
};

/** One page of catalog skills. */
export type CatalogPage = {
  data: CatalogSkill[];
  pagination: CatalogPagination;
};

/** One immutable catalog generation snapshot described by the manifest. */
export type CatalogSnapshot = {
  generation: string;
  generatedAt: string;
  pageCount: number;
  perPage: number;
  total: number;
  view: "all-time";
};

/** The `/v1/catalog` manifest payload. */
export type CatalogManifest = {
  schemaVersion: 1;
  current: CatalogSnapshot;
  previous?: CatalogSnapshot;
};

/**
 * The generation the client is currently locked onto.
 *
 * `generation` / `pageCount` / `total` are an inseparable triple: they always
 * describe the same snapshot, so the renderer can never mix two generations.
 */
export type CatalogGenerationInfo = {
  generation: string;
  generatedAt: string;
  pageCount: number;
  total: number;
  /** true = serving the `previous` snapshot after a 503 fallback (locked for the session). */
  isFallback: boolean;
};

/** Structured failure classification consumed by the renderer to pick an i18n key. */
export type CatalogErrorCode =
  | "config"
  | "warming"
  | "not-found"
  | "unavailable"
  | "network"
  | "invalid-response"
  | "unknown"
  /** Search only: rejected locally (query too short, illegal owner) — no request was sent. */
  | "invalid-query"
  /** Search only: upstream returned 429. Carries `retryAfterSeconds`. */
  | "rate-limited";

export type CatalogFailure = {
  code: CatalogErrorCode;
  /** English technical detail for logs/diagnostics. Never rendered directly in the UI. */
  message: string;
  /** Only present for `warming` and `rate-limited`. */
  retryAfterSeconds?: number;
};

/** Discriminated result used by every catalog IPC channel. Handlers never reject. */
export type CatalogResult<T> = { ok: true; data: T } | { ok: false; error: CatalogFailure };

export type CatalogManifestResult = {
  generation: CatalogGenerationInfo;
};

export type CatalogPageResult = {
  page: number;
  skills: CatalogSkill[];
  /** Authoritative pageCount / total / isFallback for the page that was served. */
  generation: CatalogGenerationInfo;
};

export type CatalogPageInput = {
  page: number;
  forceRefresh?: boolean;
};

/**
 * The matching strategy upstream actually used. Single word queries take the
 * fuzzy path, multi word queries take the semantic one.
 */
export type CatalogSearchType = "fuzzy" | "semantic";

export type CatalogSearchInput = {
  /** Raw user input. Callers do not need to trim; the client normalizes it. */
  query: string;
  /** 1..200, defaults to 50. Out of range values are clamped, not rejected. */
  limit?: number;
  /** Optional GitHub owner filter. */
  owner?: string;
};

/**
 * A search response.
 *
 * Deliberately **not** shaped like `CatalogPageResult`: search has no
 * generation, no pagination and no fallback, so the renderer must never show
 * stale-generation affordances in search mode.
 */
export type CatalogSearchResult = {
  /** Normalized query echoed back, used for "results for xxx" headings. */
  query: string;
  skills: CatalogSkill[];
  searchType: CatalogSearchType;
  count: number;
  /** `count` reached `limit`, so more matches may exist — prompt to refine. */
  truncated: boolean;
};
