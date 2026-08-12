import { CATALOG_BASE_URL } from "../app-constants";
import { CATALOG_SEARCH_MAX_QUERY_LENGTH, CATALOG_SEARCH_MIN_QUERY_LENGTH, CatalogHttpError, DEFAULT_RETRY_AFTER_SECONDS, fetchCatalogManifest, fetchCatalogPage, fetchCatalogSearch, isCatalogHttpError, isValidSearchOwner, normalizeCatalogBaseUrl, normalizeSearchQuery, resolveSearchLimit, type CatalogSearchPayload } from "./catalog-http";
import type { CatalogFailure, CatalogGenerationInfo, CatalogManifest, CatalogManifestResult, CatalogPage, CatalogPageInput, CatalogPageResult, CatalogResult, CatalogSearchInput, CatalogSearchResult, CatalogSnapshot } from "./catalog-types";

/** Client side generation TTL. Deliberately much shorter than the server side 6h rotation. */
export const CATALOG_GENERATION_TTL_MS = 5 * 60_000;
/** Retries after the first 202 response. */
export const CATALOG_MAX_WARMING_ATTEMPTS = 3;
/** A 404 refreshes the manifest at most once per call. */
export const CATALOG_MAX_MANIFEST_REFRESH_ATTEMPTS = 1;
/** A 503 falls back to `previous` at most once per call. */
export const CATALOG_MAX_FALLBACK_ATTEMPTS = 1;
/** Timeout for a single HTTP round trip. */
export const CATALOG_REQUEST_TIMEOUT_MS = 15_000;
/** Absolute deadline for one IPC call, regardless of how retries combine. */
export const CATALOG_CALL_BUDGET_MS = 25_000;
/** FIFO page cache capacity. */
export const CATALOG_MAX_CACHED_PAGES = 6;
/**
 * Search gets its own retry axis: only a 429 backs off, exactly once.
 * The manifest-refresh and fallback axes are meaningless for search.
 */
export const CATALOG_MAX_SEARCH_RETRY_ATTEMPTS = 1;
/** LRU capacity for search results. */
export const CATALOG_MAX_CACHED_SEARCHES = 8;
/** Search result TTL, matched to the Worker's own 60s freshness window. */
export const CATALOG_SEARCH_CACHE_TTL_MS = 60_000;

export type CatalogClientOptions = {
  baseUrl?: string;
  fetchImpl?: typeof fetch;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
};

export type CatalogClient = {
  getManifest(options?: { forceRefresh?: boolean }): Promise<CatalogResult<CatalogManifestResult>>;
  getPage(input: CatalogPageInput): Promise<CatalogResult<CatalogPageResult>>;
  /**
   * Full catalog search. Completely independent of the browse path: it never
   * reads or writes the manifest, the active generation or the page cache, so
   * a failed search cannot poison browsing state.
   */
  search(input: CatalogSearchInput): Promise<CatalogResult<CatalogSearchResult>>;
  /** Drops every piece of in-memory state. Used by tests and by hard refreshes. */
  reset(): void;
};

/**
 * Four independent counters plus one absolute deadline.
 *
 * Every re-entry decrements exactly one counter and never resets it, so the
 * worst case number of re-entries is bounded by 3 + 1 + 1 + 1 = 6.
 */
type AttemptBudget = {
  warmingAttemptsLeft: number;
  manifestRefreshAttemptsLeft: number;
  fallbackAttemptsLeft: number;
  searchRetryAttemptsLeft: number;
  deadlineAt: number;
};

type SearchCacheEntry = {
  payload: CatalogSearchPayload;
  fetchedAt: number;
};

const toGenerationInfo = (snapshot: CatalogSnapshot, isFallback: boolean): CatalogGenerationInfo => ({
  generation: snapshot.generation,
  generatedAt: snapshot.generatedAt,
  pageCount: snapshot.pageCount,
  total: snapshot.total,
  isFallback
});

/**
 * Decide which generation to serve after a manifest (re)load.
 *
 * Staying on a fallback generation survives TTL refreshes ("lock the session
 * to one generation"), but the moment the server drops that snapshot we return
 * to `current` instead of getting stuck on a generation that no longer exists.
 */
export const selectActiveGeneration = (manifest: CatalogManifest, previousActive: CatalogGenerationInfo | null): CatalogGenerationInfo => {
  const previousSnapshot = manifest.previous;

  if (previousActive?.isFallback && previousSnapshot && previousSnapshot.generation === previousActive.generation) {
    return toGenerationInfo(previousSnapshot, true);
  }

  return toGenerationInfo(manifest.current, false);
};

const defaultSleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const defaultFetchImpl: typeof fetch = (...args: Parameters<typeof fetch>) => fetch(...args);

const toFailure = (error: unknown): CatalogFailure => {
  if (isCatalogHttpError(error)) {
    return error.retryAfterSeconds === undefined
      ? { code: error.code, message: error.message }
      : {
          code: error.code,
          message: error.message,
          retryAfterSeconds: error.retryAfterSeconds
        };
  }

  return {
    code: "unknown",
    message: error instanceof Error ? error.message : String(error)
  };
};

export const createCatalogClient = (options: CatalogClientOptions = {}): CatalogClient => {
  const baseUrl = normalizeCatalogBaseUrl(options.baseUrl ?? CATALOG_BASE_URL);
  const fetchImpl = options.fetchImpl ?? defaultFetchImpl;
  const now = options.now ?? ((): number => Date.now());
  const sleep = options.sleep ?? defaultSleep;

  let cachedManifest: CatalogManifest | null = null;
  let manifestFetchedAt = 0;
  let inflightManifest: Promise<CatalogManifest> | null = null;
  let activeGeneration: CatalogGenerationInfo | null = null;
  const pageCache = new Map<string, CatalogPage>();
  const searchCache = new Map<string, SearchCacheEntry>();

  /**
   * Clears browse state only. The search cache survives on purpose: a page
   * level recovery (404 remap, fallback, force refresh) says nothing about
   * whether a search result is still valid. Only `reset()` clears both.
   */
  const clearAllState = (): void => {
    cachedManifest = null;
    manifestFetchedAt = 0;
    activeGeneration = null;
    pageCache.clear();
  };

  const createBudget = (): AttemptBudget => ({
    warmingAttemptsLeft: CATALOG_MAX_WARMING_ATTEMPTS,
    manifestRefreshAttemptsLeft: CATALOG_MAX_MANIFEST_REFRESH_ATTEMPTS,
    fallbackAttemptsLeft: CATALOG_MAX_FALLBACK_ATTEMPTS,
    searchRetryAttemptsLeft: CATALOG_MAX_SEARCH_RETRY_ATTEMPTS,
    deadlineAt: now() + CATALOG_CALL_BUDGET_MS
  });

  const assertBaseUrl = (): void => {
    if (!baseUrl || !/^https?:\/\//i.test(baseUrl)) {
      throw new CatalogHttpError("config", "Catalog base URL is not configured.");
    }
  };

  const assertBudget = (budget: AttemptBudget): void => {
    if (now() > budget.deadlineAt) {
      throw new CatalogHttpError("network", "Catalog request exceeded its time budget.");
    }
  };

  const waitForRetry = async (retryAfterSeconds: number | undefined): Promise<void> => {
    await sleep((retryAfterSeconds ?? DEFAULT_RETRY_AFTER_SECONDS) * 1000);
  };

  /** Single-flight manifest load so concurrent page requests never stampede. */
  const loadManifest = async (): Promise<CatalogManifest> => {
    const existing = inflightManifest;

    if (existing) {
      return existing;
    }

    const request = fetchCatalogManifest({
      baseUrl,
      fetchImpl,
      timeoutMs: CATALOG_REQUEST_TIMEOUT_MS
    });

    inflightManifest = request;

    try {
      const manifest = await request;

      cachedManifest = manifest;
      manifestFetchedAt = now();

      return manifest;
    } finally {
      if (inflightManifest === request) {
        inflightManifest = null;
      }
    }
  };

  const resolveGeneration = async (budget: AttemptBudget): Promise<CatalogGenerationInfo> => {
    assertBaseUrl();

    for (;;) {
      assertBudget(budget);

      if (activeGeneration && cachedManifest && now() - manifestFetchedAt < CATALOG_GENERATION_TTL_MS) {
        return activeGeneration;
      }

      let manifest: CatalogManifest;

      try {
        manifest = await loadManifest();
      } catch (error: unknown) {
        if (isCatalogHttpError(error) && error.code === "warming" && budget.warmingAttemptsLeft > 0) {
          budget.warmingAttemptsLeft -= 1;
          await waitForRetry(error.retryAfterSeconds);
          continue;
        }

        throw error;
      }

      const next = selectActiveGeneration(manifest, activeGeneration);

      if (next.generation !== activeGeneration?.generation) {
        pageCache.clear();
      }

      activeGeneration = next;

      return next;
    }
  };

  /** `pagination.total` is more authoritative than the manifest total (see spec A3). */
  const applyPageTotal = (generation: CatalogGenerationInfo, total: number): CatalogGenerationInfo => {
    if (!Number.isFinite(total) || total < 0 || total === generation.total) {
      return generation;
    }

    const updated: CatalogGenerationInfo = { ...generation, total };

    if (activeGeneration && activeGeneration.generation === generation.generation) {
      activeGeneration = updated;
    }

    return updated;
  };

  const cachePage = (key: string, value: CatalogPage): void => {
    if (pageCache.has(key)) {
      pageCache.delete(key);
    }

    pageCache.set(key, value);

    while (pageCache.size > CATALOG_MAX_CACHED_PAGES) {
      const oldestKey = pageCache.keys().next();

      if (oldestKey.done) {
        break;
      }

      pageCache.delete(oldestKey.value);
    }
  };

  /** Reading refreshes recency so the LRU evicts genuinely cold queries. */
  const readSearchCache = (key: string): CatalogSearchPayload | null => {
    const entry = searchCache.get(key);

    if (!entry) {
      return null;
    }

    if (now() - entry.fetchedAt >= CATALOG_SEARCH_CACHE_TTL_MS) {
      searchCache.delete(key);

      return null;
    }

    searchCache.delete(key);
    searchCache.set(key, entry);

    return entry.payload;
  };

  const cacheSearch = (key: string, payload: CatalogSearchPayload): void => {
    if (searchCache.has(key)) {
      searchCache.delete(key);
    }

    searchCache.set(key, { payload, fetchedAt: now() });

    while (searchCache.size > CATALOG_MAX_CACHED_SEARCHES) {
      const oldestKey = searchCache.keys().next();

      if (oldestKey.done) {
        break;
      }

      searchCache.delete(oldestKey.value);
    }
  };

  const toSearchResult = (payload: CatalogSearchPayload, query: string, limit: number): CatalogSearchResult => ({
    query: payload.query === "" ? query : payload.query,
    skills: payload.data,
    searchType: payload.searchType,
    count: payload.count,
    truncated: payload.count >= limit
  });

  const search = async (input: CatalogSearchInput): Promise<CatalogResult<CatalogSearchResult>> => {
    const query = normalizeSearchQuery(typeof input?.query === "string" ? input.query : "");

    if (query.length < CATALOG_SEARCH_MIN_QUERY_LENGTH || query.length > CATALOG_SEARCH_MAX_QUERY_LENGTH) {
      return {
        ok: false,
        error: {
          code: "invalid-query",
          message: `Search query must be between ${CATALOG_SEARCH_MIN_QUERY_LENGTH} and ${CATALOG_SEARCH_MAX_QUERY_LENGTH} characters.`
        }
      };
    }

    const rawOwner = typeof input.owner === "string" ? input.owner.trim() : "";
    const owner = rawOwner === "" ? undefined : rawOwner.toLowerCase();

    if (owner !== undefined && !isValidSearchOwner(owner)) {
      return {
        ok: false,
        error: {
          code: "invalid-query",
          message: "Search owner filter is not a valid GitHub owner."
        }
      };
    }

    const limit = resolveSearchLimit(input.limit);
    const cacheKey = `${query}|${limit}|${owner ?? ""}`;
    const cachedPayload = readSearchCache(cacheKey);

    if (cachedPayload) {
      return { ok: true, data: toSearchResult(cachedPayload, query, limit) };
    }

    const budget = createBudget();

    try {
      assertBaseUrl();

      for (;;) {
        assertBudget(budget);

        try {
          const payload = await fetchCatalogSearch({
            baseUrl,
            fetchImpl,
            timeoutMs: CATALOG_REQUEST_TIMEOUT_MS,
            query,
            limit,
            ...(owner === undefined ? {} : { owner })
          });

          cacheSearch(cacheKey, payload);

          return { ok: true, data: toSearchResult(payload, query, limit) };
        } catch (error: unknown) {
          if (!isCatalogHttpError(error)) {
            throw error;
          }

          // `warming` cannot normally reach here (search never touches KV
          // snapshots), but if it ever does it shares the single retry axis
          // instead of silently falling through as a hard failure.
          const isRetryable = error.code === "rate-limited" || error.code === "warming";

          if (isRetryable && budget.searchRetryAttemptsLeft > 0) {
            budget.searchRetryAttemptsLeft -= 1;
            await waitForRetry(error.retryAfterSeconds);
            continue;
          }

          throw error;
        }
      }
    } catch (error: unknown) {
      return { ok: false, error: toFailure(error) };
    }
  };

  const getManifest = async (manifestOptions: { forceRefresh?: boolean } = {}): Promise<CatalogResult<CatalogManifestResult>> => {
    const budget = createBudget();

    if (manifestOptions.forceRefresh === true) {
      clearAllState();
    }

    try {
      return { ok: true, data: { generation: await resolveGeneration(budget) } };
    } catch (error: unknown) {
      return { ok: false, error: toFailure(error) };
    }
  };

  const getPage = async (input: CatalogPageInput): Promise<CatalogResult<CatalogPageResult>> => {
    const page = input?.page;

    if (!Number.isInteger(page) || page < 0) {
      return {
        ok: false,
        error: { code: "not-found", message: "Invalid catalog page index." }
      };
    }

    const budget = createBudget();

    if (input.forceRefresh === true) {
      clearAllState();
    }

    try {
      for (;;) {
        assertBudget(budget);

        const generation = await resolveGeneration(budget);
        const cacheKey = `${generation.generation}:${page}`;
        const cachedPage = pageCache.get(cacheKey);

        if (cachedPage) {
          return {
            ok: true,
            data: {
              page,
              skills: cachedPage.data,
              generation: applyPageTotal(generation, cachedPage.pagination.total)
            }
          };
        }

        try {
          const catalogPage = await fetchCatalogPage({
            baseUrl,
            fetchImpl,
            timeoutMs: CATALOG_REQUEST_TIMEOUT_MS,
            generation: generation.generation,
            page
          });

          cachePage(cacheKey, catalogPage);

          return {
            ok: true,
            data: {
              page,
              skills: catalogPage.data,
              generation: applyPageTotal(generation, catalogPage.pagination.total)
            }
          };
        } catch (error: unknown) {
          if (!isCatalogHttpError(error)) {
            throw error;
          }

          if (error.code === "warming" && budget.warmingAttemptsLeft > 0) {
            budget.warmingAttemptsLeft -= 1;
            await waitForRetry(error.retryAfterSeconds);
            continue;
          }

          if (error.code === "not-found" && budget.manifestRefreshAttemptsLeft > 0) {
            budget.manifestRefreshAttemptsLeft -= 1;
            clearAllState();
            continue;
          }

          if (error.code === "unavailable" && budget.fallbackAttemptsLeft > 0) {
            const previousSnapshot = cachedManifest?.previous;

            if (previousSnapshot && previousSnapshot.generation !== generation.generation) {
              budget.fallbackAttemptsLeft -= 1;
              activeGeneration = toGenerationInfo(previousSnapshot, true);
              // Refresh the timestamp so the TTL cannot immediately bounce back to current.
              manifestFetchedAt = now();
              pageCache.clear();
              continue;
            }
          }

          throw error;
        }
      }
    } catch (error: unknown) {
      return { ok: false, error: toFailure(error) };
    }
  };

  return {
    getManifest,
    getPage,
    search,
    reset: (): void => {
      clearAllState();
      searchCache.clear();
      inflightManifest = null;
    }
  };
};
