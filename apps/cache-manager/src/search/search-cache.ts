import {
  buildSearchCacheKey,
  buildSkillsShSearchUrl,
  parseSearchQuery,
  projectSearchBody,
  type SearchQueryParams
} from "./search-query";
import type { ResponseCache } from "../details/detail-cache";
import { fetchSkillsSh } from "../security/skills-sh-fetch";
import type { SkillsShTokenProvider } from "../security/skills-sh-token";
import type { CacheManagerEnv, WorkerBindings } from "../worker-env";
import type { Context } from "hono";

type SearchCacheDependencies = {
  cache?: ResponseCache;
  fetchImpl: typeof fetch;
  now: () => Date;
  tokenProvider: SkillsShTokenProvider;
};

/** How long a cached search response is served as a HIT. Mirrors upstream's 30-60s window. */
export const searchFreshnessMs = 60 * 1_000;
/** Cache API retention. Longer than freshness only so `match` still returns the entry. */
const searchRetentionSeconds = 5 * 60;
const searchStoredAtHeader = "x-search-stored-at";

/**
 * Headers echoed from upstream, mirroring `detail-cache.ts`. `content-type` is
 * always re-set afterwards because we emit our own JSON body, but keeping the
 * whitelist identical avoids two divergent lists.
 */
const forwardedHeaders = [
  "content-type",
  "retry-after",
  "x-ratelimit-limit",
  "x-ratelimit-remaining",
  "x-ratelimit-reset"
] as const;

const copyHeaders = (source: Headers): Headers => {
  const headers = new Headers();

  for (const name of forwardedHeaders) {
    const value = source.get(name);

    if (value !== null) {
      headers.set(name, value);
    }
  }

  return headers;
};

const errorResponse = (
  code: string,
  message: string,
  status: number,
  headers: Headers = new Headers()
): Response => {
  headers.set("content-type", "application/json; charset=UTF-8");
  headers.set("cache-control", "no-store");
  headers.set("x-cache", "MISS");

  return new Response(JSON.stringify({ error: code, message }), { status, headers });
};

const createClientResponse = (
  response: Response,
  cacheStatus: "HIT" | "MISS",
  maxAgeSeconds: number
): Response => {
  const headers = new Headers(response.headers);

  headers.delete(searchStoredAtHeader);
  headers.set("cache-control", `public, max-age=${Math.max(0, maxAgeSeconds)}`);
  headers.set("x-cache", cacheStatus);

  return new Response(response.body, { status: response.status, headers });
};

const discardBody = async (response: Response): Promise<void> => {
  try {
    await response.body?.cancel();
  } catch {
    // A rejected body must never turn a mapped error into a thrown exception.
  }
};

/**
 * Normalize an upstream failure.
 *
 * A 401 is never surfaced: `fetchSkillsSh` already retried once with a fresh
 * token, so a second 401 means our broker is misconfigured — a server fault,
 * not a client one. Upstream bodies are dropped so token diagnostics cannot leak.
 */
const mapUpstreamFailure = async (upstream: Response): Promise<Response> => {
  await discardBody(upstream);

  const headers = copyHeaders(upstream.headers);

  if (upstream.status === 400) {
    return errorResponse("invalid_query", "The search query was rejected upstream.", 400, headers);
  }

  if (upstream.status === 429) {
    return errorResponse(
      "rate_limited",
      "The search API is rate limited. Retry after the indicated delay.",
      429,
      headers
    );
  }

  if (upstream.status === 401 || upstream.status === 503) {
    return errorResponse(
      "search_unavailable",
      "Skill search is temporarily unavailable.",
      503,
      headers
    );
  }

  return errorResponse(
    "search_unavailable",
    "Skill search is temporarily unavailable.",
    502,
    headers
  );
};

const fetchSearch = async (
  bindings: WorkerBindings,
  params: SearchQueryParams,
  cacheKey: Request,
  dependencies: SearchCacheDependencies
): Promise<Response> => {
  let upstream: Response;

  try {
    upstream = await fetchSkillsSh(
      buildSkillsShSearchUrl(params),
      bindings,
      dependencies.tokenProvider,
      dependencies.fetchImpl
    );
  } catch {
    return errorResponse("search_unavailable", "Skill search is temporarily unavailable.", 502);
  }

  if (!upstream.ok) {
    return mapUpstreamFailure(upstream);
  }

  const upstreamBody = await upstream.text();
  const projectedBody = projectSearchBody(upstreamBody, params);

  if (projectedBody === null) {
    return errorResponse(
      "invalid_search_response",
      "The search response from skills.sh is invalid.",
      502
    );
  }

  const headers = new Headers();

  headers.set("content-type", "application/json; charset=UTF-8");
  headers.set("cache-control", `public, max-age=${searchRetentionSeconds}`);
  headers.set(searchStoredAtHeader, String(dependencies.now().getTime()));

  const stored = new Response(projectedBody, { headers });

  if (dependencies.cache) {
    try {
      await dependencies.cache.put(cacheKey, stored.clone());
    } catch {
      // Search caching is an optimization and must not fail a valid response.
    }
  }

  return createClientResponse(stored, "MISS", searchFreshnessMs / 1_000);
};

/**
 * Build the `GET /v1/catalog/search` handler.
 *
 * Real-time proxy with a 60s Workers Cache window and **no**
 * stale-while-revalidate: the query key space is unbounded, so background
 * refreshes would only amplify upstream traffic. Expired entries go back to
 * the origin.
 */
export const createSearchHandler = (dependencies: SearchCacheDependencies) => {
  return async (context: Context<CacheManagerEnv>): Promise<Response> => {
    const parsed = parseSearchQuery(new URL(context.req.url).searchParams);

    if (!parsed.ok) {
      return errorResponse(parsed.code, parsed.message, 400);
    }

    const cacheKey = new Request(buildSearchCacheKey(parsed.params), { method: "GET" });

    let cached: Response | undefined;

    try {
      cached = await dependencies.cache?.match(cacheKey);
    } catch {
      cached = undefined;
    }

    if (cached) {
      const storedAt = Number(cached.headers.get(searchStoredAtHeader));
      const ageMs = dependencies.now().getTime() - storedAt;

      if (Number.isFinite(ageMs) && ageMs >= 0 && ageMs < searchFreshnessMs) {
        return createClientResponse(cached, "HIT", Math.ceil((searchFreshnessMs - ageMs) / 1_000));
      }
    }

    return fetchSearch(context.env, parsed.params, cacheKey, dependencies);
  };
};
