import { describe, expect, it, vi } from "vitest";
import { Hono } from "hono";

import { createSearchHandler } from "./search-cache";
import type { ResponseCache } from "../details/detail-cache";
import type { SkillsShTokenProvider } from "../security/skills-sh-token";
import { MemoryKv } from "../test/memory-kv";
import type { CacheManagerEnv, WorkerBindings } from "../worker-env";

/**
 * Isolated unit tests for the `GET /v1/catalog/search` handler.
 *
 * Unlike `app.test.ts` (which exercises the handler through the full application
 * router) these tests mount only `createSearchHandler` on a bare Hono instance so
 * the error mapping, the 60s Cache window and the KV isolation guarantee (C3) can
 * be asserted without the catalog routes.
 */

/** In-memory stand-in for `caches.default`, mirroring the one used in app.test.ts. */
class MemoryResponseCache implements ResponseCache {
  readonly values = new Map<string, Response>();

  async match(request: Request): Promise<Response | undefined> {
    return this.values.get(request.url)?.clone();
  }

  async put(request: Request, response: Response): Promise<void> {
    this.values.set(request.url, response.clone());
  }
}

const now = () => new Date("2026-07-29T01:00:00.000Z");

const createTokenProvider = (): SkillsShTokenProvider => ({
  getToken: vi.fn().mockResolvedValue("oidc-token"),
  invalidate: vi.fn()
});

const upstreamSearchBody = (overrides: Record<string, unknown> = {}): string =>
  JSON.stringify({
    data: [{ id: "vercel-labs/skills/find-skills", name: "Find Skills" }],
    query: "react",
    searchType: "fuzzy",
    count: 1,
    durationMs: 42,
    ...overrides
  });

const respondWith = (body: string, init: ResponseInit = {}) =>
  vi.fn<typeof fetch>().mockImplementation(async () => new Response(body, init));

const envWith = (kv: MemoryKv): WorkerBindings => ({
  SKILLS_SH_CACHE: kv,
  SKILLS_SH_TOKEN_URL: "https://token.example/api/token",
  SKILLS_SH_TOKEN_SECRET: "token-secret",
  CACHE_ADMIN_TOKEN: "admin-secret",
  CORS_ALLOWED_ORIGINS: "*"
});

const createSearchApp = (
  fetchImpl: ReturnType<typeof respondWith>,
  overrides: Partial<Parameters<typeof createSearchHandler>[0]> = {}
) => {
  const cache = new MemoryResponseCache();
  const app = new Hono<CacheManagerEnv>();

  app.get(
    "/v1/catalog/search",
    createSearchHandler({
      cache,
      fetchImpl,
      now,
      tokenProvider: createTokenProvider(),
      ...overrides
    })
  );

  return { app, cache };
};

describe("search handler error mapping", () => {
  it("maps an upstream 400 to invalid_query with a 400 status", async () => {
    const kv = new MemoryKv();
    const fetchImpl = respondWith("missing required parameter", { status: 400 });
    const { app } = createSearchApp(fetchImpl);

    const response = await app.request("/v1/catalog/search?q=react", {}, envWith(kv));

    expect(response.status).toBe(400);
    expect((await response.json()).error).toBe("invalid_query");
    expect(response.headers.get("cache-control")).toBe("no-store");
    // A 400 is not a 401, so no token-refresh retry is attempted upstream.
    expect(fetchImpl).toHaveBeenCalledOnce();
  });

  it("maps an upstream 429 to rate_limited with a 429 status", async () => {
    const kv = new MemoryKv();
    const { app } = createSearchApp(
      respondWith("slow down", {
        status: 429,
        headers: { "retry-after": "30", "x-ratelimit-limit": "100" }
      })
    );

    const response = await app.request("/v1/catalog/search?q=react", {}, envWith(kv));

    expect(response.status).toBe(429);
    expect((await response.json()).error).toBe("rate_limited");
    expect(response.headers.get("retry-after")).toBe("30");
    expect(response.headers.get("x-ratelimit-limit")).toBe("100");
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("hides an upstream 401 behind a generic 503 response", async () => {
    const kv = new MemoryKv();
    const fetchImpl = respondWith("Unauthorized: the bearer token expired", { status: 401 });
    const { app } = createSearchApp(fetchImpl);

    const response = await app.request("/v1/catalog/search?q=react", {}, envWith(kv));
    const body = await response.text();

    expect(response.status).toBe(503);
    expect(JSON.parse(body).error).toBe("search_unavailable");
    // The 401 triggers exactly one token-refresh retry before giving up.
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(body).not.toContain("401");
    expect(body.toLowerCase()).not.toContain("token");
  });

  it("maps an upstream 503 to search_unavailable", async () => {
    const kv = new MemoryKv();
    const { app } = createSearchApp(respondWith("upstream down", { status: 503 }));

    const response = await app.request("/v1/catalog/search?q=react", {}, envWith(kv));

    expect(response.status).toBe(503);
    expect((await response.json()).error).toBe("search_unavailable");
  });

  it("maps an unexpected upstream 5xx (500) to a 502 instead of surfacing it", async () => {
    const kv = new MemoryKv();
    const fetchImpl = respondWith("internal error", { status: 500 });
    const { app } = createSearchApp(fetchImpl);

    const response = await app.request("/v1/catalog/search?q=react", {}, envWith(kv));

    expect(response.status).toBe(502);
    expect((await response.json()).error).toBe("search_unavailable");
    expect(fetchImpl).toHaveBeenCalledOnce();
  });

  it("maps a rejected upstream fetch to a 502 without throwing", async () => {
    const kv = new MemoryKv();
    const fetchImpl = vi.fn<typeof fetch>().mockRejectedValue(new Error("network unreachable"));
    const { app } = createSearchApp(fetchImpl);

    const response = await app.request("/v1/catalog/search?q=react", {}, envWith(kv));

    expect(response.status).toBe(502);
    expect((await response.json()).error).toBe("search_unavailable");
  });

  it("rejects a malformed upstream search payload with invalid_search_response (502)", async () => {
    const kv = new MemoryKv();
    const { app } = createSearchApp(respondWith(JSON.stringify({ data: [] })));

    const response = await app.request("/v1/catalog/search?q=react", {}, envWith(kv));

    expect(response.status).toBe(502);
    expect((await response.json()).error).toBe("invalid_search_response");
  });
});

describe("search handler caching", () => {
  it("serves a cached result as a HIT within the 60s window", async () => {
    const kv = new MemoryKv();
    const fetchImpl = respondWith(upstreamSearchBody());
    const { app } = createSearchApp(fetchImpl);

    const first = await app.request("/v1/catalog/search?q=react", {}, envWith(kv));
    const second = await app.request("/v1/catalog/search?q=react", {}, envWith(kv));

    expect(first.headers.get("x-cache")).toBe("MISS");
    expect(second.status).toBe(200);
    expect(second.headers.get("x-cache")).toBe("HIT");
    expect((await second.json()).count).toBe(1);
    expect(fetchImpl).toHaveBeenCalledOnce();
  });

  it("returns to the origin after the 60s window elapses", async () => {
    const kv = new MemoryKv();
    let currentTime = new Date("2026-07-29T01:00:00.000Z");
    const fetchImpl = respondWith(upstreamSearchBody());
    const { app } = createSearchApp(fetchImpl, { now: () => currentTime });

    await app.request("/v1/catalog/search?q=react", {}, envWith(kv));
    currentTime = new Date("2026-07-29T01:01:01.000Z");
    const expired = await app.request("/v1/catalog/search?q=react", {}, envWith(kv));

    expect(expired.headers.get("x-cache")).toBe("MISS");
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });
});

describe("search path KV isolation (C3 constraint)", () => {
  it("never writes to the catalog KV namespace on any search outcome", async () => {
    const kv = new MemoryKv();
    const fetchImpl = respondWith(upstreamSearchBody());
    const { app } = createSearchApp(fetchImpl);

    // Successful MISS + HIT pair.
    await app.request("/v1/catalog/search?q=react", {}, envWith(kv));
    await app.request("/v1/catalog/search?q=react", {}, envWith(kv));
    // A second distinct (cache-missing) query.
    await app.request("/v1/catalog/search?q=react&limit=10", {}, envWith(kv));
    // A locally-rejected query that never reaches upstream.
    await app.request("/v1/catalog/search?q=a", {}, envWith(kv));
    // An upstream failure that exercises the error-mapping branch (500 → 502).
    // A dedicated app with a failing fetch impl is used, and a query that has
    // not been seen before, so it does not collide with the 60s cache window
    // above and actually reaches upstream instead of being served as a HIT.
    // The same observed `kv` is passed, so the no-write guarantee holds for
    // this outcome too.
    const failingApp = createSearchApp(respondWith("upstream boom", { status: 500 })).app;
    const failure = await failingApp.request("/v1/catalog/search?q=vue", {}, envWith(kv));

    expect(failure.status).toBe(502);
    expect((await failure.json()).error).toBe("search_unavailable");

    expect(kv.values.size).toBe(0);
    expect(kv.operations.filter((op) => op.startsWith("put:"))).toHaveLength(0);
    expect(kv.operations.filter((op) => op.startsWith("delete:"))).toHaveLength(0);
  });
});
