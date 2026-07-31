import type { Context } from "hono";

import {
  buildSkillsShDetailUrl,
  projectSkillDetailBody,
  type SkillReference
} from "./skill-detail";
import { fetchSkillsSh } from "../security/skills-sh-fetch";
import type { SkillsShTokenProvider } from "../security/skills-sh-token";
import type { CacheManagerEnv, WorkerBindings } from "../worker-env";

export interface ResponseCache {
  match(request: Request): Promise<Response | undefined>;
  put(request: Request, response: Response): Promise<void>;
}

type DetailCacheDependencies = {
  cache?: ResponseCache;
  fetchImpl: typeof fetch;
  now: () => Date;
  tokenProvider: SkillsShTokenProvider;
  waitUntil: (context: Context<CacheManagerEnv>, promise: Promise<unknown>) => void;
};

const detailFreshnessMs = 5 * 60 * 1_000;
const detailRetentionSeconds = 60 * 60;
const detailStoredAtHeader = "x-detail-stored-at";
const forwardedHeaders = [
  "content-type",
  "retry-after",
  "x-ratelimit-limit",
  "x-ratelimit-remaining",
  "x-ratelimit-reset"
] as const;

const createCacheKey = (request: Request): Request =>
  new Request(new URL(request.url), { method: "GET" });

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

const createClientResponse = (
  response: Response,
  cacheStatus: "HIT" | "MISS" | "STALE",
  maxAgeSeconds: number
): Response => {
  const headers = new Headers(response.headers);
  headers.delete(detailStoredAtHeader);
  headers.set("cache-control", `public, max-age=${Math.max(0, maxAgeSeconds)}`);
  headers.set("x-cache", cacheStatus);
  return new Response(response.body, { status: response.status, headers });
};

const fetchDetail = async (
  bindings: WorkerBindings,
  reference: SkillReference,
  cacheKey: Request,
  dependencies: DetailCacheDependencies
): Promise<Response> => {
  let upstream: Response;
  try {
    upstream = await fetchSkillsSh(
      buildSkillsShDetailUrl(reference),
      bindings,
      dependencies.tokenProvider,
      dependencies.fetchImpl
    );
  } catch {
    return Response.json(
      { error: "detail_unavailable", message: "The skill detail is temporarily unavailable." },
      { status: 502, headers: { "cache-control": "no-store", "x-cache": "MISS" } }
    );
  }

  const upstreamBody = await upstream.text();
  if (!upstream.ok) {
    const headers = copyHeaders(upstream.headers);
    headers.set("cache-control", "no-store");
    headers.set("x-cache", "MISS");
    return new Response(upstreamBody, { status: upstream.status, headers });
  }

  const projectedBody = projectSkillDetailBody(upstreamBody);
  if (projectedBody === null) {
    return Response.json(
      { error: "invalid_detail", message: "The skill detail response is invalid." },
      { status: 502, headers: { "cache-control": "no-store", "x-cache": "MISS" } }
    );
  }

  const headers = copyHeaders(upstream.headers);
  headers.set("content-type", "application/json; charset=UTF-8");
  headers.set("cache-control", `public, max-age=${detailRetentionSeconds}`);
  headers.set(detailStoredAtHeader, String(dependencies.now().getTime()));
  const stored = new Response(projectedBody, { headers });
  if (dependencies.cache) {
    try {
      await dependencies.cache.put(cacheKey, stored.clone());
    } catch {
      // Detail caching is an optimization and must not make a valid upstream response fail.
    }
  }
  return createClientResponse(stored, "MISS", detailFreshnessMs / 1_000);
};

export const createDetailHandler = (dependencies: DetailCacheDependencies) => {
  const refreshes = new Map<string, Promise<Response>>();

  const refresh = (
    bindings: WorkerBindings,
    reference: SkillReference,
    cacheKey: Request
  ): Promise<Response> => {
    const key = cacheKey.url;
    const current = refreshes.get(key);
    if (current) {
      return current;
    }

    const next = fetchDetail(bindings, reference, cacheKey, dependencies).finally(() => {
      refreshes.delete(key);
    });
    refreshes.set(key, next);
    return next;
  };

  return async (
    context: Context<CacheManagerEnv>,
    reference: SkillReference
  ): Promise<Response> => {
    const cacheKey = createCacheKey(context.req.raw);
    let cached: Response | undefined;
    try {
      cached = await dependencies.cache?.match(cacheKey);
    } catch {
      cached = undefined;
    }
    if (cached) {
      const storedAt = Number(cached.headers.get(detailStoredAtHeader));
      const ageMs = dependencies.now().getTime() - storedAt;
      if (Number.isFinite(ageMs) && ageMs >= 0 && ageMs < detailFreshnessMs) {
        return createClientResponse(cached, "HIT", Math.ceil((detailFreshnessMs - ageMs) / 1_000));
      }

      dependencies.waitUntil(
        context,
        refresh(context.env, reference, cacheKey).then(() => undefined)
      );
      return createClientResponse(cached, "STALE", 0);
    }

    return refresh(context.env, reference, cacheKey);
  };
};
