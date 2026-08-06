import { afterEach, describe, expect, it, vi } from "vitest";

import { createApp } from "./app";
import { catalogManifestKey, catalogPageKey, catalogStatusKey } from "./catalog/keys";
import type { CatalogManifest, CatalogSyncStatus } from "./catalog/types";
import type { SkillsShTokenProvider } from "./security/skills-sh-token";
import { createUnsignedJwt } from "./test/create-jwt";
import { MemoryKv } from "./test/memory-kv";

class MemoryResponseCache {
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

const manifest: CatalogManifest = {
  schemaVersion: 1,
  current: {
    generation: "current-generation",
    generatedAt: "2026-07-29T00:00:00.000Z",
    pageCount: 2,
    perPage: 500,
    total: 501,
    view: "all-time"
  },
  previous: {
    generation: "previous-generation",
    generatedAt: "2026-07-28T18:00:00.000Z",
    pageCount: 1,
    perPage: 500,
    total: 1,
    view: "all-time"
  }
};

const envWith = (kv: MemoryKv) => ({
  SKILLS_SH_CACHE: kv,
  SKILLS_SH_TOKEN_URL: "https://token.example/api/token",
  SKILLS_SH_TOKEN_SECRET: "token-secret",
  CACHE_ADMIN_TOKEN: "admin-secret",
  CORS_ALLOWED_ORIGINS: "*"
});

describe("cache manager API", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns the current catalog manifest", async () => {
    const kv = new MemoryKv();
    kv.values.set(catalogManifestKey, JSON.stringify(manifest));

    const syncCatalogImpl = vi.fn();
    const response = await createApp({ now, syncCatalogImpl }).request(
      "/v1/catalog",
      {},
      envWith(kv)
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(manifest);
    expect(response.headers.get("x-cache")).toBe("HIT");
    expect(syncCatalogImpl).not.toHaveBeenCalled();
  });

  it("serves a stale manifest while refreshing the complete catalog", async () => {
    const kv = new MemoryKv();
    kv.values.set(catalogManifestKey, JSON.stringify(manifest));
    const syncCatalogImpl = vi.fn().mockResolvedValue(manifest);
    const deferred: Promise<unknown>[] = [];
    const app = createApp({
      now: () => new Date("2026-07-29T07:00:00.000Z"),
      syncCatalogImpl,
      waitUntil: (promise) => deferred.push(promise)
    });

    const response = await app.request("/v1/catalog", {}, envWith(kv));
    await Promise.all(deferred);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(manifest);
    expect(response.headers.get("x-cache")).toBe("STALE");
    expect(syncCatalogImpl).toHaveBeenCalledOnce();
  });

  it("warms an empty catalog on first access", async () => {
    const kv = new MemoryKv();
    const syncCatalogImpl = vi.fn().mockResolvedValue(manifest);
    const deferred: Promise<unknown>[] = [];
    const app = createApp({
      now,
      syncCatalogImpl,
      waitUntil: (promise) => deferred.push(promise)
    });

    const response = await app.request("/v1/catalog", {}, envWith(kv));
    await Promise.all(deferred);

    expect(response.status).toBe(202);
    expect(response.headers.get("retry-after")).toBe("2");
    expect(await response.json()).toEqual({
      status: "warming",
      message: "The catalog is being prepared. Retry shortly."
    });
    expect(syncCatalogImpl).toHaveBeenCalledOnce();
  });

  it("returns only pages from a generation declared by the manifest", async () => {
    const kv = new MemoryKv();
    const body = JSON.stringify({ data: [], pagination: { page: 0 } });
    const previousBody = JSON.stringify({
      data: [{ id: "previous" }],
      pagination: { page: 0 }
    });
    kv.values.set(catalogManifestKey, JSON.stringify(manifest));
    kv.values.set(catalogPageKey("current-generation", 0), body);
    kv.values.set(catalogPageKey("previous-generation", 0), previousBody);

    const app = createApp({ now });
    const allowed = await app.request("/v1/catalog/current-generation/pages/0", {}, envWith(kv));
    const undeclared = await app.request("/v1/catalog/unknown-generation/pages/0", {}, envWith(kv));
    const previous = await app.request("/v1/catalog/previous-generation/pages/0", {}, envWith(kv));

    expect(allowed.status).toBe(200);
    expect(await allowed.text()).toBe(body);
    expect(allowed.headers.get("x-catalog-generation")).toBe("current-generation");
    expect(await previous.text()).toBe(previousBody);
    expect(undeclared.status).toBe(404);
  });

  it("returns sync status without caching it", async () => {
    const kv = new MemoryKv();
    const status: CatalogSyncStatus = {
      status: "success",
      lastAttemptAt: "2026-07-29T00:00:00.000Z",
      lastSuccessAt: "2026-07-29T00:00:00.000Z",
      error: null
    };
    kv.values.set(catalogStatusKey, JSON.stringify(status));

    const response = await createApp({ now }).request("/v1/status", {}, envWith(kv));

    expect(await response.json()).toEqual(status);
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("rejects an unauthorized manual sync", async () => {
    const kv = new MemoryKv();

    const response = await createApp({ now }).request(
      "/internal/sync",
      { method: "POST" },
      envWith(kv)
    );

    expect(response.status).toBe(401);
  });

  it("preserves the Cloudflare global fetch receiver during manual sync", async () => {
    const kv = new MemoryKv();
    const currentTime = new Date("2026-07-29T01:00:00.000Z");
    const expiresAt = Math.floor(currentTime.getTime() / 1_000) + 3_600;
    const token = createUnsignedJwt(expiresAt);
    const fetchImpl = vi.fn(async function (
      this: unknown,
      input: RequestInfo | URL
    ): Promise<Response> {
      if (this !== globalThis) {
        throw new TypeError("Illegal invocation: function called with incorrect `this` reference");
      }
      if (String(input) === "https://token.example/api/token") {
        return Response.json({ token, expiresAt });
      }
      return Response.json({
        data: [{ id: "owner/repo/skill" }],
        pagination: { page: 0, perPage: 500, total: 1, hasMore: false }
      });
    });
    vi.stubGlobal("fetch", fetchImpl);

    const response = await createApp({ now: () => currentTime }).request(
      "/internal/sync",
      { method: "POST", headers: { authorization: "Bearer admin-secret" } },
      envWith(kv)
    );

    expect(response.status).toBe(200);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("caches projected skill details for five minutes", async () => {
    const kv = new MemoryKv();
    const detailCache = new MemoryResponseCache();
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({
        id: "owner/repo/skill",
        source: "owner/repo",
        slug: "skill",
        name: "Skill",
        hash: "sha256",
        files: [{ path: "SKILL.md", contents: "secretly large" }]
      })
    );
    const app = createApp({
      detailCache,
      fetchImpl,
      now,
      tokenProvider: createTokenProvider()
    });

    const first = await app.request("/v1/skills/owner/repo/skill", {}, envWith(kv));
    const second = await app.request("/v1/skills/owner/repo/skill", {}, envWith(kv));

    expect(first.status).toBe(200);
    expect(first.headers.get("x-cache")).toBe("MISS");
    expect(await first.json()).toEqual({
      id: "owner/repo/skill",
      source: "owner/repo",
      slug: "skill",
      name: "Skill",
      hash: "sha256"
    });
    expect(second.headers.get("x-cache")).toBe("HIT");
    expect(fetchImpl).toHaveBeenCalledOnce();
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://skills.sh/api/v1/skills/owner/repo/skill",
      expect.objectContaining({
        headers: expect.objectContaining({ authorization: "Bearer oidc-token" })
      })
    );
  });

  it("serves stale skill details while revalidating after five minutes", async () => {
    const kv = new MemoryKv();
    const detailCache = new MemoryResponseCache();
    let currentTime = new Date("2026-07-29T01:00:00.000Z");
    const deferred: Promise<unknown>[] = [];
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        Response.json({
          id: "owner/repo/skill",
          source: "owner/repo",
          slug: "skill",
          name: "Old name",
          files: []
        })
      )
      .mockResolvedValueOnce(
        Response.json({
          id: "owner/repo/skill",
          source: "owner/repo",
          slug: "skill",
          name: "New name",
          files: []
        })
      );
    const app = createApp({
      detailCache,
      fetchImpl,
      now: () => currentTime,
      tokenProvider: createTokenProvider(),
      waitUntil: (promise) => deferred.push(promise)
    });

    await app.request("/v1/skills/owner/repo/skill", {}, envWith(kv));
    currentTime = new Date("2026-07-29T01:05:01.000Z");
    const stale = await app.request("/v1/skills/owner/repo/skill", {}, envWith(kv));
    expect(stale.headers.get("x-cache")).toBe("STALE");
    expect((await stale.json()).name).toBe("Old name");

    await Promise.all(deferred);
    const refreshed = await app.request("/v1/skills/owner/repo/skill", {}, envWith(kv));
    expect(refreshed.headers.get("x-cache")).toBe("HIT");
    expect((await refreshed.json()).name).toBe("New name");
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("returns skill details when the optional response cache is unavailable", async () => {
    const kv = new MemoryKv();
    const detailCache = {
      match: vi.fn().mockRejectedValue(new Error("cache read failed")),
      put: vi.fn().mockRejectedValue(new Error("cache write failed"))
    };
    const app = createApp({
      detailCache,
      fetchImpl: vi.fn<typeof fetch>().mockResolvedValue(
        Response.json({
          id: "owner/repo/skill",
          source: "owner/repo",
          slug: "skill",
          name: "Skill",
          files: []
        })
      ),
      now,
      tokenProvider: createTokenProvider()
    });

    const response = await app.request("/v1/skills/owner/repo/skill", {}, envWith(kv));

    expect(response.status).toBe(200);
    expect(response.headers.get("x-cache")).toBe("MISS");
    expect((await response.json()).name).toBe("Skill");
    expect(detailCache.match).toHaveBeenCalledOnce();
    expect(detailCache.put).toHaveBeenCalledOnce();
  });
});

describe("catalog search", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
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

  const createSearchApp = (
    fetchImpl: ReturnType<typeof respondWith>,
    overrides: Parameters<typeof createApp>[0] = {}
  ) =>
    createApp({
      fetchImpl,
      now,
      searchCache: new MemoryResponseCache(),
      tokenProvider: createTokenProvider(),
      ...overrides
    });

  it("proxies a search and projects the upstream payload", async () => {
    const kv = new MemoryKv();
    const fetchImpl = respondWith(upstreamSearchBody());
    const app = createSearchApp(fetchImpl);

    const response = await app.request("/v1/catalog/search?q=react", {}, envWith(kv));

    expect(response.status).toBe(200);
    expect(response.headers.get("x-cache")).toBe("MISS");
    expect(response.headers.get("cache-control")).toBe("public, max-age=60");
    expect(await response.json()).toEqual({
      data: [{ id: "vercel-labs/skills/find-skills", name: "Find Skills" }],
      query: "react",
      searchType: "fuzzy",
      count: 1
    });
    expect(fetchImpl).toHaveBeenCalledOnce();
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://skills.sh/api/v1/skills/search?q=react&limit=50",
      expect.objectContaining({
        headers: expect.objectContaining({ authorization: "Bearer oidc-token" })
      })
    );
  });

  it("serves a cached search result for sixty seconds", async () => {
    const kv = new MemoryKv();
    const fetchImpl = respondWith(upstreamSearchBody());
    const app = createSearchApp(fetchImpl);

    const first = await app.request("/v1/catalog/search?q=react", {}, envWith(kv));
    const second = await app.request("/v1/catalog/search?q=react", {}, envWith(kv));

    expect(first.headers.get("x-cache")).toBe("MISS");
    expect(second.status).toBe(200);
    expect(second.headers.get("x-cache")).toBe("HIT");
    expect((await second.json()).count).toBe(1);
    expect(fetchImpl).toHaveBeenCalledOnce();
  });

  it("returns to the origin once the sixty second window elapses", async () => {
    const kv = new MemoryKv();
    let currentTime = new Date("2026-07-29T01:00:00.000Z");
    const fetchImpl = respondWith(upstreamSearchBody());
    const app = createSearchApp(fetchImpl, { now: () => currentTime });

    await app.request("/v1/catalog/search?q=react", {}, envWith(kv));
    currentTime = new Date("2026-07-29T01:01:01.000Z");
    const expired = await app.request("/v1/catalog/search?q=react", {}, envWith(kv));

    expect(expired.headers.get("x-cache")).toBe("MISS");
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("collapses case and whitespace variants onto one cache entry", async () => {
    const kv = new MemoryKv();
    const fetchImpl = respondWith(upstreamSearchBody());
    const app = createSearchApp(fetchImpl);

    const mixedCase = await app.request("/v1/catalog/search?q=React", {}, envWith(kv));
    const padded = await app.request("/v1/catalog/search?q=%20react%20", {}, envWith(kv));

    expect(mixedCase.headers.get("x-cache")).toBe("MISS");
    expect(padded.headers.get("x-cache")).toBe("HIT");
    expect(fetchImpl).toHaveBeenCalledOnce();
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://skills.sh/api/v1/skills/search?q=React&limit=50",
      expect.anything()
    );
  });

  it("rejects a missing or too short query before calling upstream", async () => {
    const kv = new MemoryKv();
    const fetchImpl = respondWith(upstreamSearchBody());
    const app = createSearchApp(fetchImpl);

    const missing = await app.request("/v1/catalog/search", {}, envWith(kv));
    const tooShort = await app.request("/v1/catalog/search?q=a", {}, envWith(kv));

    expect(missing.status).toBe(400);
    expect((await missing.json()).error).toBe("invalid_query");
    expect(missing.headers.get("cache-control")).toBe("no-store");
    expect(tooShort.status).toBe(400);
    expect((await tooShort.json()).error).toBe("invalid_query");
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("clamps an oversized limit to the upstream maximum", async () => {
    const kv = new MemoryKv();
    const fetchImpl = respondWith(upstreamSearchBody());
    const app = createSearchApp(fetchImpl);

    const response = await app.request("/v1/catalog/search?q=react&limit=9999", {}, envWith(kv));

    expect(response.status).toBe(200);
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://skills.sh/api/v1/skills/search?q=react&limit=200",
      expect.anything()
    );
  });

  it("rejects a non numeric limit", async () => {
    const kv = new MemoryKv();
    const fetchImpl = respondWith(upstreamSearchBody());
    const app = createSearchApp(fetchImpl);

    const response = await app.request("/v1/catalog/search?q=react&limit=abc", {}, envWith(kv));

    expect(response.status).toBe(400);
    expect((await response.json()).error).toBe("invalid_limit");
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("validates the owner filter and forwards a legal one", async () => {
    const kv = new MemoryKv();
    const rejectingFetch = respondWith(upstreamSearchBody());
    const rejected = await createSearchApp(rejectingFetch).request(
      "/v1/catalog/search?q=react&owner=a/b",
      {},
      envWith(kv)
    );

    expect(rejected.status).toBe(400);
    expect((await rejected.json()).error).toBe("invalid_owner");
    expect(rejectingFetch).not.toHaveBeenCalled();

    const acceptingFetch = respondWith(upstreamSearchBody());
    const accepted = await createSearchApp(acceptingFetch).request(
      "/v1/catalog/search?q=react&owner=expo",
      {},
      envWith(kv)
    );

    expect(accepted.status).toBe(200);
    expect(acceptingFetch).toHaveBeenCalledWith(
      "https://skills.sh/api/v1/skills/search?q=react&limit=50&owner=expo",
      expect.anything()
    );
  });

  it("hides an upstream 401 behind a generic unavailable response", async () => {
    const kv = new MemoryKv();
    const fetchImpl = respondWith("Unauthorized: the bearer token expired", { status: 401 });
    const app = createSearchApp(fetchImpl);

    const response = await app.request("/v1/catalog/search?q=react", {}, envWith(kv));
    const body = await response.text();

    expect(response.status).toBe(503);
    expect(JSON.parse(body).error).toBe("search_unavailable");
    expect(body).not.toContain("401");
    expect(body.toLowerCase()).not.toContain("token");
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("maps an upstream 400 to invalid_query with a 400 status", async () => {
    const kv = new MemoryKv();
    const fetchImpl = respondWith("missing required parameter", { status: 400 });
    const app = createSearchApp(fetchImpl);

    const response = await app.request("/v1/catalog/search?q=react", {}, envWith(kv));

    expect(response.status).toBe(400);
    expect((await response.json()).error).toBe("invalid_query");
    expect(response.headers.get("cache-control")).toBe("no-store");
    // A 400 is not a 401, so no token-refresh retry is attempted upstream.
    expect(fetchImpl).toHaveBeenCalledOnce();
  });

  it("forwards rate limit headers when upstream returns 429", async () => {
    const kv = new MemoryKv();
    const fetchImpl = respondWith("slow down", {
      status: 429,
      headers: {
        "retry-after": "30",
        "x-ratelimit-limit": "100",
        "x-ratelimit-remaining": "0",
        "x-ratelimit-reset": "1800000000"
      }
    });
    const app = createSearchApp(fetchImpl);

    const response = await app.request("/v1/catalog/search?q=react", {}, envWith(kv));

    expect(response.status).toBe(429);
    expect((await response.json()).error).toBe("rate_limited");
    expect(response.headers.get("retry-after")).toBe("30");
    expect(response.headers.get("x-ratelimit-limit")).toBe("100");
    expect(response.headers.get("x-ratelimit-remaining")).toBe("0");
    expect(response.headers.get("x-ratelimit-reset")).toBe("1800000000");
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("maps an upstream 503 to search_unavailable", async () => {
    const kv = new MemoryKv();
    const app = createSearchApp(respondWith("upstream down", { status: 503 }));

    const response = await app.request("/v1/catalog/search?q=react", {}, envWith(kv));

    expect(response.status).toBe(503);
    expect((await response.json()).error).toBe("search_unavailable");
  });

  it("maps an unexpected upstream 5xx (500) to a 502 instead of surfacing it", async () => {
    const kv = new MemoryKv();
    const fetchImpl = respondWith("internal error", { status: 500 });
    const app = createSearchApp(fetchImpl);

    const response = await app.request("/v1/catalog/search?q=react", {}, envWith(kv));

    expect(response.status).toBe(502);
    expect((await response.json()).error).toBe("search_unavailable");
    expect(fetchImpl).toHaveBeenCalledOnce();
  });

  it("maps a rejected upstream fetch to a 502 instead of throwing", async () => {
    const kv = new MemoryKv();
    const fetchImpl = vi.fn<typeof fetch>().mockRejectedValue(new Error("network unreachable"));
    const app = createSearchApp(fetchImpl as ReturnType<typeof respondWith>);

    const response = await app.request("/v1/catalog/search?q=react", {}, envWith(kv));

    expect(response.status).toBe(502);
    expect((await response.json()).error).toBe("search_unavailable");
  });

  it("rejects a malformed upstream search payload", async () => {
    const kv = new MemoryKv();
    const app = createSearchApp(respondWith(JSON.stringify({ data: [] })));

    const response = await app.request("/v1/catalog/search?q=react", {}, envWith(kv));

    expect(response.status).toBe(502);
    expect((await response.json()).error).toBe("invalid_search_response");
  });

  it("returns search results when the response cache is unavailable", async () => {
    const kv = new MemoryKv();
    const searchCache = {
      match: vi.fn().mockRejectedValue(new Error("cache read failed")),
      put: vi.fn().mockRejectedValue(new Error("cache write failed"))
    };
    const app = createSearchApp(respondWith(upstreamSearchBody()), { searchCache });

    const response = await app.request("/v1/catalog/search?q=react", {}, envWith(kv));

    expect(response.status).toBe(200);
    expect(response.headers.get("x-cache")).toBe("MISS");
    expect((await response.json()).count).toBe(1);
    expect(searchCache.match).toHaveBeenCalledOnce();
    expect(searchCache.put).toHaveBeenCalledOnce();
  });

  it("keeps the skill detail route working alongside the search route", async () => {
    const kv = new MemoryKv();
    const fetchImpl = vi.fn<typeof fetch>().mockImplementation(async (input) => {
      if (String(input).includes("/skills/search")) {
        return new Response(upstreamSearchBody());
      }
      return Response.json({
        id: "vercel-labs/skills/find-skills",
        source: "vercel-labs/skills",
        slug: "find-skills",
        name: "Find Skills",
        files: []
      });
    });
    const app = createApp({
      detailCache: new MemoryResponseCache(),
      fetchImpl,
      now,
      searchCache: new MemoryResponseCache(),
      tokenProvider: createTokenProvider()
    });

    const detail = await app.request("/v1/skills/vercel-labs/skills/find-skills", {}, envWith(kv));
    const search = await app.request("/v1/catalog/search?q=react", {}, envWith(kv));

    expect(detail.status).toBe(200);
    expect(await detail.json()).toEqual({
      id: "vercel-labs/skills/find-skills",
      source: "vercel-labs/skills",
      slug: "find-skills",
      name: "Find Skills"
    });
    expect(search.status).toBe(200);
    expect((await search.json()).searchType).toBe("fuzzy");
  });

  it("never treats the literal search segment as a catalog generation", async () => {
    const kv = new MemoryKv();
    kv.values.set(catalogManifestKey, JSON.stringify(manifest));
    const app = createSearchApp(respondWith(upstreamSearchBody()));

    const response = await app.request("/v1/catalog/search?q=react", {}, envWith(kv));

    expect(response.status).toBe(200);
    expect(response.headers.get("x-catalog-generation")).toBeNull();
  });

  it("never writes to the catalog KV namespace during search (C3 constraint)", async () => {
    const kv = new MemoryKv();
    const fetchImpl = respondWith(upstreamSearchBody());
    const app = createSearchApp(fetchImpl);

    // Successful MISS + HIT pair.
    await app.request("/v1/catalog/search?q=react", {}, envWith(kv));
    await app.request("/v1/catalog/search?q=react", {}, envWith(kv));
    // A second distinct (cache-missing) query.
    await app.request("/v1/catalog/search?q=react&limit=10", {}, envWith(kv));
    // A locally-rejected query that never reaches upstream.
    await app.request("/v1/catalog/search?q=a", {}, envWith(kv));
    // An upstream failure that exercises the error-mapping branch (500 → 502).
    // A dedicated app with a failing fetch impl is used with a query that has
    // not been seen before, so it reaches upstream instead of being served as
    // a cache HIT. The same observed `kv` is passed so the no-write guarantee
    // holds for this outcome too.
    const failingApp = createSearchApp(respondWith("upstream boom", { status: 500 }));
    const failure = await failingApp.request("/v1/catalog/search?q=vue", {}, envWith(kv));

    expect(failure.status).toBe(502);
    expect((await failure.json()).error).toBe("search_unavailable");

    // The search path is a real-time proxy to skills.sh and must not mutate the
    // persistent catalog KV (`SKILLS_SH_CACHE`). Results live only in the Cache API.
    expect(kv.values.size).toBe(0);
    expect(kv.operations.filter((op) => op.startsWith("put:"))).toHaveLength(0);
    expect(kv.operations.filter((op) => op.startsWith("delete:"))).toHaveLength(0);
  });
});

describe("CORS headers", () => {
  const corsAssertions = (response: Response) => {
    expect(response.headers.get("access-control-allow-origin")).toBe("*");
    expect(response.headers.get("access-control-allow-methods")).toBe("GET, OPTIONS");
    expect(response.headers.get("access-control-allow-headers")).toBe("Content-Type");
    expect(response.headers.get("access-control-max-age")).toBe("86400");
  };

  it("attaches CORS headers to a successful manifest response", async () => {
    const kv = new MemoryKv();
    kv.values.set(catalogManifestKey, JSON.stringify(manifest));
    const response = await createApp({ now }).request(
      "/v1/catalog",
      { headers: { origin: "http://localhost:3700" } },
      envWith(kv)
    );
    expect(response.status).toBe(200);
    corsAssertions(response);
  });

  it("attaches CORS headers to a 202 warming response", async () => {
    const kv = new MemoryKv();
    const syncCatalogImpl = vi.fn().mockResolvedValue(manifest);
    const deferred: Promise<unknown>[] = [];
    const app = createApp({
      now,
      syncCatalogImpl,
      waitUntil: (promise) => deferred.push(promise)
    });
    const response = await app.request(
      "/v1/catalog",
      { headers: { origin: "http://localhost:3700" } },
      envWith(kv)
    );
    await Promise.all(deferred);
    expect(response.status).toBe(202);
    corsAssertions(response);
  });

  it("attaches CORS headers to a 404 not-found response", async () => {
    const kv = new MemoryKv();
    kv.values.set(catalogManifestKey, JSON.stringify(manifest));
    const response = await createApp({ now }).request(
      "/v1/catalog/unknown-generation/pages/0",
      { headers: { origin: "http://localhost:3700" } },
      envWith(kv)
    );
    expect(response.status).toBe(404);
    corsAssertions(response);
  });

  it("attaches CORS headers to a 503 page-unavailable response", async () => {
    const kv = new MemoryKv();
    kv.values.set(catalogManifestKey, JSON.stringify(manifest));
    const response = await createApp({ now }).request(
      "/v1/catalog/current-generation/pages/0",
      { headers: { origin: "http://localhost:3700" } },
      envWith(kv)
    );
    expect(response.status).toBe(503);
    corsAssertions(response);
  });

  it("attaches CORS headers to a search response", async () => {
    const kv = new MemoryKv();
    const app = createApp({
      fetchImpl: vi.fn<typeof fetch>().mockImplementation(
        async () =>
          new Response(
            JSON.stringify({
              data: [{ id: "vercel-labs/skills/find-skills" }],
              query: "react",
              searchType: "fuzzy",
              count: 1
            })
          )
      ),
      now,
      searchCache: new MemoryResponseCache(),
      tokenProvider: createTokenProvider()
    });
    const response = await app.request(
      "/v1/catalog/search?q=react",
      { headers: { origin: "http://localhost:3700" } },
      envWith(kv)
    );
    expect(response.status).toBe(200);
    corsAssertions(response);
  });

  it("answers CORS preflight requests with a 204 and headers", async () => {
    const kv = new MemoryKv();
    const syncCatalogImpl = vi.fn().mockResolvedValue(manifest);
    const deferred: Promise<unknown>[] = [];
    const app = createApp({
      now,
      syncCatalogImpl,
      waitUntil: (promise) => deferred.push(promise)
    });
    const response = await app.request("/v1/catalog", {
      method: "OPTIONS",
      headers: { origin: "http://localhost:3700" }
    });
    await Promise.all(deferred);
    expect(response.status).toBe(204);
    corsAssertions(response);
  });

  it("echoes the request origin when it is in CORS_ALLOWED_ORIGINS", async () => {
    const kv = new MemoryKv();
    kv.values.set(catalogManifestKey, JSON.stringify(manifest));
    const response = await createApp({ now }).request(
      "/v1/catalog",
      { headers: { origin: "http://localhost:3700" } },
      { ...envWith(kv), CORS_ALLOWED_ORIGINS: "http://localhost:3700,https://app.example.com" }
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("access-control-allow-origin")).toBe("http://localhost:3700");
    expect(response.headers.get("vary")).toBe("Origin");
  });

  it("omits CORS headers when the origin is not in CORS_ALLOWED_ORIGINS", async () => {
    const kv = new MemoryKv();
    kv.values.set(catalogManifestKey, JSON.stringify(manifest));
    const response = await createApp({ now }).request(
      "/v1/catalog",
      { headers: { origin: "http://evil.example.com" } },
      { ...envWith(kv), CORS_ALLOWED_ORIGINS: "http://localhost:3700" }
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("access-control-allow-origin")).toBeNull();
  });
});
