import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CatalogErrorCode, CatalogSearchType, CatalogSkill } from "@/global";
import { formatCompact } from "../discover-utils";

export type DiscoverStatus = "loading" | "success" | "error";

/**
 * `browse` paginates an immutable catalog generation; `search` proxies skills.sh
 * in real time. The two modes own **disjoint** state so switching back and forth
 * never mixes a generation snapshot with relevance-ranked search hits.
 */
export type DiscoverMode = "browse" | "search";

/** Wait this long after the last keystroke before issuing a search request. */
export const DISCOVER_SEARCH_DEBOUNCE_MS = 300;

/**
 * Shortest query that may reach the network.
 *
 * This mirrors the main-process rule (which is authoritative and would answer
 * `invalid-query`), but it cannot be imported: the renderer may only reference
 * the zero-runtime `catalog-types` module, and a threshold is a value, not a
 * type. Duplicating one integer here keeps the renderer from firing requests it
 * already knows will be rejected.
 */
export const DISCOVER_MIN_SEARCH_LENGTH = 2;

/** Collapse whitespace so "  react   hooks " and "react hooks" are one query. */
export const normalizeDiscoverQuery = (value: string): string => value.trim().replace(/\s+/g, " ");

/**
 * Discover page state hook.
 *
 * Responsibilities are intentionally narrow: call the catalog IPC, consume the
 * already-classified `CatalogResult`, and hold UI state. All retries, backoff,
 * generation fallback, result caching and TTL handling live in the main
 * process; this hook only debounces input and guards against stale responses.
 */
export function useDiscoverPageState() {
  // ── Browse mode state ──────────────────────────────────────
  const [browseSkills, setBrowseSkills] = useState<CatalogSkill[]>([]);
  const [browseStatus, setBrowseStatus] = useState<DiscoverStatus>("loading");
  const [browseErrorCode, setBrowseErrorCode] = useState<CatalogErrorCode | null>(null);
  const [page, setPage] = useState(0);
  const [pageCount, setPageCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [isFallbackGeneration, setIsFallbackGeneration] = useState(false);

  // ── Search mode state ──────────────────────────────────────
  const [searchInput, setSearchInput] = useState("");
  const [committedQuery, setCommittedQuery] = useState("");
  const [searchSkills, setSearchSkills] = useState<CatalogSkill[]>([]);
  const [searchStatus, setSearchStatus] = useState<DiscoverStatus>("loading");
  const [searchErrorCode, setSearchErrorCode] = useState<CatalogErrorCode | null>(null);
  const [searchRetryAfterSeconds, setSearchRetryAfterSeconds] = useState<number | null>(null);
  const [searchResultQuery, setSearchResultQuery] = useState("");
  const [searchType, setSearchType] = useState<CatalogSearchType>("semantic");
  const [searchCount, setSearchCount] = useState(0);
  const [searchTruncated, setSearchTruncated] = useState(false);

  // Race guards. Browse and search keep **separate** counters on purpose: they
  // write to disjoint state, so a slow browse response landing while the user is
  // searching is not stale data — it is the correct page to show on the way back.
  // A single shared counter would drop it and strand browse mode on "loading".
  const browseRequestIdRef = useRef(0);
  const searchRequestIdRef = useRef(0);
  // 404 self-heal may only happen once; the main process enforces its own
  // independent manifest-refresh budget, so the combination stays bounded.
  const notFoundRecoveredRef = useRef(false);

  const mode: DiscoverMode =
    committedQuery.length >= DISCOVER_MIN_SEARCH_LENGTH ? "search" : "browse";

  const load = useCallback(async (targetPage: number, forceRefresh = false) => {
    const requestId = ++browseRequestIdRef.current;
    setBrowseStatus("loading");
    setBrowseErrorCode(null);

    const getCatalogPage = window.skillsManager?.getCatalogPage;
    if (!getCatalogPage) {
      setBrowseStatus("error");
      setBrowseErrorCode("unknown");
      return;
    }

    const result = await getCatalogPage({ page: targetPage, forceRefresh });
    if (requestId !== browseRequestIdRef.current) {
      // A newer request superseded this one; drop the stale response.
      return;
    }

    if (result.ok) {
      setBrowseSkills(result.data.skills);
      setPageCount(result.data.generation.pageCount);
      setTotalCount(result.data.generation.total);
      setIsFallbackGeneration(result.data.generation.isFallback);
      notFoundRecoveredRef.current = false;
      setBrowseStatus("success");
      return;
    }

    // 404 self-heal: the generation rotated or the page is out of range →
    // return to page 0 and retry once (forceRefresh so the manifest is re-fetched).
    if (result.error.code === "not-found" && !notFoundRecoveredRef.current) {
      notFoundRecoveredRef.current = true;
      if (targetPage !== 0) {
        setPage(0);
        return;
      }
      void load(0, true);
      return;
    }

    setBrowseErrorCode(result.error.code);
    setBrowseStatus("error");
  }, []);

  const runSearch = useCallback(async (query: string) => {
    const requestId = ++searchRequestIdRef.current;
    setSearchStatus("loading");
    setSearchErrorCode(null);
    setSearchRetryAfterSeconds(null);

    const searchCatalog = window.skillsManager?.searchCatalog;
    if (!searchCatalog) {
      setSearchStatus("error");
      setSearchErrorCode("unknown");
      return;
    }

    // The main-process handler never rejects, but `invoke` itself still can when
    // the channel is unregistered (older preload, or a test that stubs a throw),
    // so the boundary is defended here rather than surfacing an unhandled rejection.
    let result;
    try {
      result = await searchCatalog({ query });
    } catch {
      if (requestId === searchRequestIdRef.current) {
        setSearchErrorCode("unknown");
        setSearchStatus("error");
      }
      return;
    }

    if (requestId !== searchRequestIdRef.current) {
      return;
    }

    if (result.ok) {
      setSearchSkills(result.data.skills);
      setSearchResultQuery(result.data.query);
      setSearchType(result.data.searchType);
      setSearchCount(result.data.count);
      setSearchTruncated(result.data.truncated);
      setSearchStatus("success");
      return;
    }

    setSearchErrorCode(result.error.code);
    setSearchRetryAfterSeconds(result.error.retryAfterSeconds ?? null);
    setSearchStatus("error");
  }, []);

  useEffect(() => {
    void load(page);
  }, [page, load]);

  // Debounce: only a query that will actually be sent is worth delaying. Falling
  // back below the threshold just returns to browse mode, which costs nothing,
  // so clearing the box feels instant instead of lagging by the debounce window.
  useEffect(() => {
    const normalized = normalizeDiscoverQuery(searchInput);
    if (normalized === committedQuery) {
      return;
    }

    if (normalized.length < DISCOVER_MIN_SEARCH_LENGTH) {
      setCommittedQuery(normalized);
      return;
    }

    const timer = setTimeout(() => setCommittedQuery(normalized), DISCOVER_SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [searchInput, committedQuery]);

  useEffect(() => {
    if (mode !== "search") {
      return;
    }

    void runSearch(committedQuery);
  }, [mode, committedQuery, runSearch]);

  /** Enter bypasses the debounce window and commits the current input at once. */
  const submitSearch = useCallback(() => {
    setCommittedQuery(normalizeDiscoverQuery(searchInput));
  }, [searchInput]);

  const clearSearch = useCallback(() => {
    setSearchInput("");
    setCommittedQuery("");
  }, []);

  const refetch = useCallback(() => {
    if (mode === "search") {
      void runSearch(committedQuery);
      return;
    }

    notFoundRecoveredRef.current = false;
    void load(page, true);
  }, [committedQuery, load, mode, page, runSearch]);

  const formattedTotal = useMemo(() => formatCompact(totalCount), [totalCount]);

  const isSearchMode = mode === "search";

  return {
    mode,
    // Active-mode projection: the component renders one list, one status and one
    // error code without having to know which mode produced them.
    skills: isSearchMode ? searchSkills : browseSkills,
    status: isSearchMode ? searchStatus : browseStatus,
    errorCode: isSearchMode ? searchErrorCode : browseErrorCode,
    retryAfterSeconds: isSearchMode ? searchRetryAfterSeconds : null,

    searchInput,
    setSearchInput,
    submitSearch,
    clearSearch,
    searchResultQuery,
    searchType,
    searchCount,
    searchTruncated,

    totalCount,
    formattedTotal,
    // Search has no generation, so a fallback snapshot must never be advertised
    // while search results are on screen.
    isStale: !isSearchMode && isFallbackGeneration,
    page,
    pageCount,
    setPage,
    refetch
  };
}
