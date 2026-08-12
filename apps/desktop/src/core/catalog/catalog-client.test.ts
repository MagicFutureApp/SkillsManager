import { beforeEach, describe, expect, it, vi } from "vitest";

import { CATALOG_MAX_CACHED_PAGES, CATALOG_MAX_CACHED_SEARCHES, CATALOG_GENERATION_TTL_MS, CATALOG_SEARCH_CACHE_TTL_MS, createCatalogClient, selectActiveGeneration, type CatalogClientOptions } from "./catalog-client";
import type { CatalogGenerationInfo, CatalogManifest, CatalogSnapshot } from "./catalog-types";

const BASE_URL = "https://catalog.example.dev";
const MANIFEST_URL = `${BASE_URL}/v1/catalog`;

const pageUrl = (generation: string, page: number): string => `${MANIFEST_URL}/${generation}/pages/${page}`;

type ResponseSpec = {
  status?: number;
  headers?: Record<string, string>;
  body?: unknown;
  throws?: Error;
};

const snapshot = (generation: string, overrides: Partial<CatalogSnapshot> = {}): CatalogSnapshot => ({
  generation,
  generatedAt: "2026-08-04T00:00:00.000Z",
  pageCount: 4,
  perPage: 500,
  total: 2000,
  view: "all-time",
  ...overrides
});

const manifestBody = (current: CatalogSnapshot, previous?: CatalogSnapshot): unknown => (previous ? { schemaVersion: 1, current, previous } : { schemaVersion: 1, current });

const pageBody = (page: number, total: number, ids: string[]): unknown => ({
  data: ids.map((id) => ({
    id,
    slug: id,
    name: id.toUpperCase(),
    source: `acme/${id}`,
    installs: 10,
    sourceType: "github",
    installUrl: null,
    url: `https://skills.sh/skills/${id}`
  })),
  pagination: { page, perPage: 500, total, hasMore: false }
});

const toResponse = (spec: ResponseSpec): Response => {
  const status = spec.status ?? 200;
  const headers = new Map(Object.entries(spec.headers ?? {}).map(([key, value]) => [key.toLowerCase(), value]));

  return {
    ok: status >= 200 && status < 300,
    status,
    headers: {
      get: (name: string): string | null => headers.get(name.toLowerCase()) ?? null
    },
    json: (): Promise<unknown> => Promise.resolve(spec.body ?? {})
  } as unknown as Response;
};

const createFetchStub = (handler: (url: string, callIndex: number) => ResponseSpec) => {
  const urls: string[] = [];
  const mock = vi.fn(async (input: unknown): Promise<Response> => {
    const url = String(input);
    const spec = handler(url, urls.length);

    urls.push(url);

    if (spec.throws) {
      throw spec.throws;
    }

    return toResponse(spec);
  });

  return { urls, mock, fetchImpl: mock as unknown as typeof fetch };
};

const createSleepMock = () => vi.fn(async (_ms: number): Promise<void> => undefined);

type SleepMock = ReturnType<typeof createSleepMock>;

type Harness = {
  urls: string[];
  sleep: SleepMock;
  advanceTime: (ms: number) => void;
  client: ReturnType<typeof createCatalogClient>;
};

const createHarness = (handler: (url: string, callIndex: number) => ResponseSpec, overrides: CatalogClientOptions = {}): Harness => {
  const { urls, fetchImpl } = createFetchStub(handler);
  const sleep = createSleepMock();
  let currentTime = 1_000_000;

  const client = createCatalogClient({
    baseUrl: BASE_URL,
    fetchImpl,
    now: () => currentTime,
    sleep,
    ...overrides
  });

  return {
    urls,
    sleep,
    advanceTime: (ms: number): void => {
      currentTime += ms;
    },
    client
  };
};

describe("selectActiveGeneration", () => {
  const current = snapshot("gen-current", { pageCount: 5, total: 2500 });
  const previous = snapshot("gen-previous", { pageCount: 3, total: 1500 });

  it("uses current when there is no active generation", () => {
    const manifest: CatalogManifest = { schemaVersion: 1, current, previous };

    expect(selectActiveGeneration(manifest, null)).toEqual({
      generation: "gen-current",
      generatedAt: current.generatedAt,
      pageCount: 5,
      total: 2500,
      isFallback: false
    });
  });

  it("stays on the fallback generation across TTL refreshes", () => {
    const manifest: CatalogManifest = { schemaVersion: 1, current, previous };
    const active: CatalogGenerationInfo = {
      generation: "gen-previous",
      generatedAt: previous.generatedAt,
      pageCount: 3,
      total: 1500,
      isFallback: true
    };

    expect(selectActiveGeneration(manifest, active)).toMatchObject({
      generation: "gen-previous",
      isFallback: true
    });
  });

  it("returns to current once the fallback generation is rotated out", () => {
    const manifest: CatalogManifest = {
      schemaVersion: 1,
      current: snapshot("gen-new"),
      previous: current
    };
    const active: CatalogGenerationInfo = {
      generation: "gen-previous",
      generatedAt: previous.generatedAt,
      pageCount: 3,
      total: 1500,
      isFallback: true
    };

    expect(selectActiveGeneration(manifest, active)).toMatchObject({
      generation: "gen-new",
      isFallback: false
    });
  });

  it("never sticks to a non-fallback generation", () => {
    const manifest: CatalogManifest = { schemaVersion: 1, current: snapshot("gen-new") };
    const active: CatalogGenerationInfo = {
      generation: "gen-current",
      generatedAt: current.generatedAt,
      pageCount: 5,
      total: 2500,
      isFallback: false
    };

    expect(selectActiveGeneration(manifest, active)).toMatchObject({
      generation: "gen-new",
      isFallback: false
    });
  });
});

describe("createCatalogClient - configuration", () => {
  it("fails with config and issues zero requests when the base URL is empty", async () => {
    const { client, urls } = createHarness(() => ({}), { baseUrl: "" });

    await expect(client.getPage({ page: 0 })).resolves.toEqual({
      ok: false,
      error: { code: "config", message: "Catalog base URL is not configured." }
    });
    expect(urls).toHaveLength(0);
  });

  it("fails with config when the base URL is not http(s)", async () => {
    const { client, urls } = createHarness(() => ({}), { baseUrl: "ftp://catalog.example.dev" });

    await expect(client.getManifest()).resolves.toMatchObject({
      ok: false,
      error: { code: "config" }
    });
    expect(urls).toHaveLength(0);
  });

  it("rejects an invalid page index without touching the network", async () => {
    const { client, urls } = createHarness(() => ({}));

    for (const page of [-1, 1.5, Number.NaN]) {
      await expect(client.getPage({ page })).resolves.toMatchObject({
        ok: false,
        error: { code: "not-found" }
      });
    }

    expect(urls).toHaveLength(0);
  });
});

describe("createCatalogClient - happy path", () => {
  let harness: Harness;

  beforeEach(() => {
    harness = createHarness((url) => {
      if (url === MANIFEST_URL) {
        return { body: manifestBody(snapshot("gen-a", { pageCount: 4, total: 2000 })) };
      }

      if (url === pageUrl("gen-a", 0)) {
        return { body: pageBody(0, 1987, ["alpha", "beta"]) };
      }

      return { status: 500 };
    });
  });

  it("resolves the manifest then the page and prefers pagination.total", async () => {
    const result = await harness.client.getPage({ page: 0 });

    expect(result.ok).toBe(true);

    if (!result.ok) return;

    expect(harness.urls).toEqual([MANIFEST_URL, pageUrl("gen-a", 0)]);
    expect(result.data.page).toBe(0);
    expect(result.data.skills.map((skill) => skill.id)).toEqual(["alpha", "beta"]);
    expect(result.data.generation).toMatchObject({
      generation: "gen-a",
      pageCount: 4,
      total: 1987,
      isFallback: false
    });
  });

  it("serves repeated page requests from the in-memory cache", async () => {
    await harness.client.getPage({ page: 0 });
    await harness.client.getPage({ page: 0 });

    expect(harness.urls).toEqual([MANIFEST_URL, pageUrl("gen-a", 0)]);
  });

  it("bypasses every cache when forceRefresh is set", async () => {
    await harness.client.getPage({ page: 0 });
    await harness.client.getPage({ page: 0, forceRefresh: true });

    expect(harness.urls).toEqual([MANIFEST_URL, pageUrl("gen-a", 0), MANIFEST_URL, pageUrl("gen-a", 0)]);
  });

  it("returns the locked generation from getManifest", async () => {
    await expect(harness.client.getManifest()).resolves.toMatchObject({
      ok: true,
      data: { generation: { generation: "gen-a", pageCount: 4, isFallback: false } }
    });
  });

  it("drops all state on reset", async () => {
    await harness.client.getPage({ page: 0 });
    harness.client.reset();
    await harness.client.getPage({ page: 0 });

    expect(harness.urls).toHaveLength(4);
  });
});

describe("createCatalogClient - warming (202)", () => {
  it("honours Retry-After and retries until the manifest is ready", async () => {
    const harness = createHarness((url, callIndex) => {
      if (url === MANIFEST_URL && callIndex === 0) {
        return { status: 202, headers: { "retry-after": "3" } };
      }

      if (url === MANIFEST_URL) {
        return { body: manifestBody(snapshot("gen-a")) };
      }

      return { body: pageBody(0, 100, ["alpha"]) };
    });

    const result = await harness.client.getPage({ page: 0 });

    expect(result.ok).toBe(true);
    expect(harness.sleep).toHaveBeenCalledTimes(1);
    expect(harness.sleep).toHaveBeenCalledWith(3000);
    expect(harness.urls).toEqual([MANIFEST_URL, MANIFEST_URL, pageUrl("gen-a", 0)]);
  });

  it("gives up with a warming failure after the warming budget is spent", async () => {
    const harness = createHarness(() => ({ status: 202, headers: { "retry-after": "2" } }));

    await expect(harness.client.getPage({ page: 0 })).resolves.toMatchObject({
      ok: false,
      error: { code: "warming", retryAfterSeconds: 2 }
    });
    expect(harness.urls).toHaveLength(4);
    expect(harness.sleep).toHaveBeenCalledTimes(3);
  });

  it("retries a warming page response against the same generation", async () => {
    let pageCalls = 0;
    const harness = createHarness((url) => {
      if (url === MANIFEST_URL) {
        return { body: manifestBody(snapshot("gen-a")) };
      }

      pageCalls += 1;

      return pageCalls === 1 ? { status: 202, headers: { "retry-after": "1" } } : { body: pageBody(0, 100, ["alpha"]) };
    });

    await expect(harness.client.getPage({ page: 0 })).resolves.toMatchObject({ ok: true });
    expect(harness.sleep).toHaveBeenCalledWith(1000);
    expect(harness.urls).toEqual([MANIFEST_URL, pageUrl("gen-a", 0), pageUrl("gen-a", 0)]);
  });
});

describe("createCatalogClient - unavailable (503) fallback", () => {
  const buildFallbackHarness = (): Harness =>
    createHarness((url) => {
      if (url === MANIFEST_URL) {
        return {
          body: manifestBody(snapshot("gen-a", { pageCount: 4, total: 2000 }), snapshot("gen-prev", { pageCount: 3, total: 1500 }))
        };
      }

      if (url.startsWith(`${MANIFEST_URL}/gen-a/`)) {
        return { status: 503 };
      }

      const page = Number(url.slice(url.lastIndexOf("/") + 1));

      return { body: pageBody(page, 1499, [`prev-${page}`]) };
    });

  it("switches the whole generation to previous and marks the result stale", async () => {
    const harness = buildFallbackHarness();
    const result = await harness.client.getPage({ page: 0 });

    expect(result.ok).toBe(true);

    if (!result.ok) return;

    expect(result.data.generation).toMatchObject({
      generation: "gen-prev",
      pageCount: 3,
      total: 1499,
      isFallback: true
    });
    expect(harness.urls).toEqual([MANIFEST_URL, pageUrl("gen-a", 0), pageUrl("gen-prev", 0)]);
  });

  it("keeps serving the fallback generation on later pages without probing current", async () => {
    const harness = buildFallbackHarness();

    await harness.client.getPage({ page: 0 });
    harness.urls.length = 0;

    const result = await harness.client.getPage({ page: 1 });

    expect(result.ok).toBe(true);
    expect(harness.urls).toEqual([pageUrl("gen-prev", 1)]);
  });

  it("stays on the fallback generation even after the manifest TTL expires", async () => {
    const harness = buildFallbackHarness();

    await harness.client.getPage({ page: 0 });
    harness.urls.length = 0;
    harness.advanceTime(CATALOG_GENERATION_TTL_MS + 1);

    const result = await harness.client.getPage({ page: 2 });

    expect(result.ok).toBe(true);

    if (!result.ok) return;

    expect(result.data.generation.isFallback).toBe(true);
    expect(harness.urls).toEqual([MANIFEST_URL, pageUrl("gen-prev", 2)]);
  });

  it("fails with unavailable when there is no previous generation", async () => {
    const harness = createHarness((url) => (url === MANIFEST_URL ? { body: manifestBody(snapshot("gen-a")) } : { status: 503 }));

    await expect(harness.client.getPage({ page: 0 })).resolves.toMatchObject({
      ok: false,
      error: { code: "unavailable" }
    });
    expect(harness.urls).toEqual([MANIFEST_URL, pageUrl("gen-a", 0)]);
  });
});

describe("createCatalogClient - not found (404) self-healing", () => {
  it("refreshes the manifest once and retries with the new generation", async () => {
    let manifestCalls = 0;
    const harness = createHarness((url) => {
      if (url === MANIFEST_URL) {
        manifestCalls += 1;

        return { body: manifestBody(snapshot(manifestCalls === 1 ? "gen-old" : "gen-new")) };
      }

      return url.includes("gen-old") ? { status: 404 } : { body: pageBody(1, 900, ["fresh"]) };
    });

    const result = await harness.client.getPage({ page: 1 });

    expect(result.ok).toBe(true);

    if (!result.ok) return;

    expect(result.data.generation.generation).toBe("gen-new");
    expect(harness.urls).toEqual([MANIFEST_URL, pageUrl("gen-old", 1), MANIFEST_URL, pageUrl("gen-new", 1)]);
  });

  it("stops after a single manifest refresh when the page stays missing", async () => {
    const harness = createHarness((url) => (url === MANIFEST_URL ? { body: manifestBody(snapshot("gen-a")) } : { status: 404 }));

    await expect(harness.client.getPage({ page: 9 })).resolves.toMatchObject({
      ok: false,
      error: { code: "not-found" }
    });
    expect(harness.urls).toHaveLength(4);
  });
});

describe("createCatalogClient - caching and concurrency", () => {
  const createPagingHarness = (): Harness =>
    createHarness((url) => {
      if (url === MANIFEST_URL) {
        return { body: manifestBody(snapshot("gen-a", { pageCount: 20, total: 9000 })) };
      }

      const page = Number(url.slice(url.lastIndexOf("/") + 1));

      return { body: pageBody(page, 9000, [`skill-${page}`]) };
    });

  it("reuses the manifest inside the TTL and refreshes it afterwards", async () => {
    const harness = createPagingHarness();

    await harness.client.getPage({ page: 0 });
    await harness.client.getPage({ page: 1 });

    expect(harness.urls).toEqual([MANIFEST_URL, pageUrl("gen-a", 0), pageUrl("gen-a", 1)]);

    harness.advanceTime(CATALOG_GENERATION_TTL_MS + 1);
    await harness.client.getPage({ page: 2 });

    expect(harness.urls).toEqual([MANIFEST_URL, pageUrl("gen-a", 0), pageUrl("gen-a", 1), MANIFEST_URL, pageUrl("gen-a", 2)]);
  });

  it("evicts the oldest page once the cache is full", async () => {
    const harness = createPagingHarness();

    for (let page = 0; page <= CATALOG_MAX_CACHED_PAGES; page += 1) {
      await harness.client.getPage({ page });
    }

    const requestsBefore = harness.urls.length;

    await harness.client.getPage({ page: CATALOG_MAX_CACHED_PAGES });
    expect(harness.urls).toHaveLength(requestsBefore);

    await harness.client.getPage({ page: 0 });
    expect(harness.urls).toHaveLength(requestsBefore + 1);
  });

  it("issues a single manifest request for concurrent page loads", async () => {
    const harness = createPagingHarness();

    const [first, second] = await Promise.all([harness.client.getPage({ page: 0 }), harness.client.getPage({ page: 1 })]);

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    expect(harness.urls.filter((url) => url === MANIFEST_URL)).toHaveLength(1);
  });
});

describe("createCatalogClient - failure classification", () => {
  it("maps a rejected fetch to network", async () => {
    const harness = createHarness(() => ({ throws: new Error("ENOTFOUND") }));

    await expect(harness.client.getPage({ page: 0 })).resolves.toMatchObject({
      ok: false,
      error: { code: "network" }
    });
  });

  it("maps a malformed manifest to invalid-response", async () => {
    const harness = createHarness(() => ({ body: { schemaVersion: 1 } }));

    await expect(harness.client.getManifest()).resolves.toMatchObject({
      ok: false,
      error: { code: "invalid-response" }
    });
  });

  it("terminates on a mixed 202 / 404 / 503 storm within a bounded number of requests", async () => {
    let pageCalls = 0;
    const harness = createHarness((url) => {
      if (url === MANIFEST_URL) {
        return {
          body: manifestBody(snapshot("gen-a"), snapshot("gen-prev", { pageCount: 2, total: 800 }))
        };
      }

      pageCalls += 1;

      if (pageCalls === 1) return { status: 202, headers: { "retry-after": "1" } };
      if (pageCalls === 2) return { status: 404 };
      if (pageCalls === 3) return { status: 503 };

      return { status: 500 };
    });

    const result = await harness.client.getPage({ page: 0 });

    expect(result.ok).toBe(false);
    expect(harness.urls.length).toBeLessThanOrEqual(8);
  });
});

describe("createCatalogClient.search", () => {
  const searchUrl = (query: string, limit = 50, owner?: string): string => `${BASE_URL}/v1/catalog/search?q=${encodeURIComponent(query)}&limit=${limit}` + (owner ? `&owner=${encodeURIComponent(owner)}` : "");

  const searchBody = (ids: string[], overrides: Record<string, unknown> = {}): unknown => ({
    data: ids.map((id) => ({
      id,
      slug: id,
      name: id.toUpperCase(),
      source: `acme/${id}`,
      installs: 3,
      sourceType: "github",
      installUrl: null,
      url: `https://skills.sh/skills/${id}`
    })),
    query: "react",
    searchType: "fuzzy",
    ...overrides
  });

  it("rejects a query shorter than two characters without touching the network", async () => {
    const harness = createHarness(() => ({ body: searchBody(["a"]) }));

    const short = await harness.client.search({ query: "a" });
    const blank = await harness.client.search({ query: "   " });
    const collapsed = await harness.client.search({ query: " \t\n " });

    for (const result of [short, blank, collapsed]) {
      expect(result).toEqual({
        ok: false,
        error: { code: "invalid-query", message: expect.stringContaining("Search query must be") }
      });
    }

    expect(harness.urls).toEqual([]);
  });

  it("rejects an illegal owner filter without touching the network", async () => {
    const harness = createHarness(() => ({ body: searchBody(["a"]) }));

    const result = await harness.client.search({ query: "react", owner: "a/b" });

    expect(result).toEqual({
      ok: false,
      error: { code: "invalid-query", message: "Search owner filter is not a valid GitHub owner." }
    });
    expect(harness.urls).toEqual([]);
  });

  it("returns normalized results for a successful search", async () => {
    const harness = createHarness(() => ({ body: searchBody(["one", "two"]) }));

    const result = await harness.client.search({ query: "  React   Native  " });

    expect(result.ok).toBe(true);

    if (!result.ok) {
      throw new Error("expected a successful search");
    }

    expect(result.data.query).toBe("react");
    expect(result.data.skills.map((skill) => skill.id)).toEqual(["one", "two"]);
    expect(result.data.searchType).toBe("fuzzy");
    expect(result.data.count).toBe(2);
    expect(result.data.truncated).toBe(false);
    expect(harness.urls).toEqual([searchUrl("React Native")]);
  });

  it("flags a result set that reached the limit as truncated", async () => {
    const harness = createHarness(() => ({ body: searchBody(["one", "two"]) }));

    const result = await harness.client.search({ query: "react", limit: 2 });

    expect(result.ok).toBe(true);

    if (!result.ok) {
      throw new Error("expected a successful search");
    }

    expect(result.data.count).toBe(2);
    expect(result.data.truncated).toBe(true);
  });

  it("clamps the limit rather than rejecting it", async () => {
    const harness = createHarness(() => ({ body: searchBody([]) }));

    await harness.client.search({ query: "react", limit: 0 });
    await harness.client.search({ query: "react", limit: 500 });
    await harness.client.search({ query: "react" });

    expect(harness.urls).toEqual([searchUrl("react", 1), searchUrl("react", 200), searchUrl("react", 50)]);
  });

  it("lowercases the owner filter and forwards it", async () => {
    const harness = createHarness(() => ({ body: searchBody([]) }));

    await harness.client.search({ query: "react", owner: "  Expo  " });

    expect(harness.urls).toEqual([searchUrl("react", 50, "expo")]);
  });

  it("backs off once after a 429 and succeeds on the retry", async () => {
    let calls = 0;
    const harness = createHarness(() => {
      calls += 1;

      return calls === 1 ? { status: 429, headers: { "retry-after": "3" } } : { body: searchBody(["one"]) };
    });

    const result = await harness.client.search({ query: "react" });

    expect(result.ok).toBe(true);
    expect(harness.sleep).toHaveBeenCalledTimes(1);
    expect(harness.sleep).toHaveBeenCalledWith(3000);
    expect(harness.urls).toHaveLength(2);
  });

  it("gives up after a second consecutive 429", async () => {
    const harness = createHarness(() => ({ status: 429, headers: { "retry-after": "3" } }));

    const result = await harness.client.search({ query: "react" });

    expect(result).toEqual({
      ok: false,
      error: {
        code: "rate-limited",
        message: expect.stringContaining("rate limited"),
        retryAfterSeconds: 3
      }
    });
    expect(harness.sleep).toHaveBeenCalledTimes(1);
    expect(harness.urls).toHaveLength(2);
  });

  it("clamps an absurd Retry-After before sleeping", async () => {
    const harness = createHarness(() => ({ status: 429, headers: { "retry-after": "999" } }));

    await harness.client.search({ query: "react" });

    expect(harness.sleep).toHaveBeenCalledWith(10_000);
  });

  it("reports a 503 as unavailable without any generation fallback", async () => {
    const harness = createHarness((url) => (url.includes("/v1/catalog/search") ? { status: 503 } : { body: manifestBody(snapshot("gen-a")) }));

    const result = await harness.client.search({ query: "react" });

    expect(result).toEqual({
      ok: false,
      error: { code: "unavailable", message: expect.stringContaining("temporarily unavailable") }
    });
    // Exactly one call: no manifest load, no fallback probe.
    expect(harness.urls).toEqual([searchUrl("react")]);
  });

  it("reports a thrown fetch as a network failure", async () => {
    const harness = createHarness(() => ({ throws: new Error("socket hang up") }));

    const result = await harness.client.search({ query: "react" });

    expect(result.ok).toBe(false);

    if (result.ok) {
      throw new Error("expected a failed search");
    }

    expect(result.error.code).toBe("network");
  });

  it("reports a malformed payload as invalid-response", async () => {
    const harness = createHarness(() => ({ body: { nope: true } }));

    const result = await harness.client.search({ query: "react" });

    expect(result.ok).toBe(false);

    if (result.ok) {
      throw new Error("expected a failed search");
    }

    expect(result.error.code).toBe("invalid-response");
  });

  it("reports a missing base URL as a config failure", async () => {
    const harness = createHarness(() => ({ body: searchBody([]) }), { baseUrl: "   " });

    const result = await harness.client.search({ query: "react" });

    expect(result).toEqual({
      ok: false,
      error: { code: "config", message: "Catalog base URL is not configured." }
    });
    expect(harness.urls).toEqual([]);
  });

  it("fails with a network error once the call budget is exhausted", async () => {
    let currentTime = 1_000_000;
    const { urls, fetchImpl } = createFetchStub(() => ({ body: searchBody([]) }));
    const client = createCatalogClient({
      baseUrl: BASE_URL,
      fetchImpl,
      now: () => {
        // The budget deadline is captured first, then time jumps past it before
        // the loop performs its pre-flight budget assertion.
        currentTime += 30_000;

        return currentTime;
      }
    });

    const result = await client.search({ query: "react" });

    expect(result.ok).toBe(false);

    if (result.ok) {
      throw new Error("expected a failed search");
    }

    expect(result.error.code).toBe("network");
    expect(urls).toEqual([]);
  });

  it("keeps browse state intact after a search failure", async () => {
    const harness = createHarness((url) => {
      if (url.includes("/v1/catalog/search")) {
        return { status: 503 };
      }

      if (url === MANIFEST_URL) {
        return { body: manifestBody(snapshot("gen-a")) };
      }

      return { body: pageBody(0, 2000, ["alpha"]) };
    });

    const failed = await harness.client.search({ query: "react" });
    const page = await harness.client.getPage({ page: 0 });

    expect(failed.ok).toBe(false);
    expect(page.ok).toBe(true);

    if (!page.ok) {
      throw new Error("expected the page to load");
    }

    expect(page.data.generation.generation).toBe("gen-a");
    expect(page.data.generation.isFallback).toBe(false);
    expect(page.data.skills.map((skill) => skill.id)).toEqual(["alpha"]);
  });

  it("serves an identical query from the LRU cache within the TTL", async () => {
    const harness = createHarness(() => ({ body: searchBody(["one"]) }));

    await harness.client.search({ query: "react" });
    harness.advanceTime(CATALOG_SEARCH_CACHE_TTL_MS - 1);
    const cached = await harness.client.search({ query: "  react  " });

    expect(cached.ok).toBe(true);
    expect(harness.urls).toHaveLength(1);
  });

  it("refetches once the cached result passes its TTL", async () => {
    const harness = createHarness(() => ({ body: searchBody(["one"]) }));

    await harness.client.search({ query: "react" });
    harness.advanceTime(CATALOG_SEARCH_CACHE_TTL_MS);
    await harness.client.search({ query: "react" });

    expect(harness.urls).toHaveLength(2);
  });

  it("keys the cache on limit and owner as well as the query", async () => {
    const harness = createHarness(() => ({ body: searchBody(["one"]) }));

    await harness.client.search({ query: "react" });
    await harness.client.search({ query: "react", limit: 10 });
    await harness.client.search({ query: "react", owner: "expo" });
    await harness.client.search({ query: "react" });

    expect(harness.urls).toEqual([searchUrl("react"), searchUrl("react", 10), searchUrl("react", 50, "expo")]);
  });

  it("evicts the least recently used entry beyond the cache capacity", async () => {
    const harness = createHarness(() => ({ body: searchBody(["one"]) }));

    for (let index = 0; index < CATALOG_MAX_CACHED_SEARCHES; index += 1) {
      await harness.client.search({ query: `query-${index}` });
    }

    // Touch the oldest entry so it is no longer the eviction candidate.
    await harness.client.search({ query: "query-0" });
    await harness.client.search({ query: "overflow" });

    expect(harness.urls).toHaveLength(CATALOG_MAX_CACHED_SEARCHES + 1);

    // `query-0` was refreshed, so it survived; `query-1` was evicted instead.
    await harness.client.search({ query: "query-0" });
    expect(harness.urls).toHaveLength(CATALOG_MAX_CACHED_SEARCHES + 1);

    await harness.client.search({ query: "query-1" });
    expect(harness.urls).toHaveLength(CATALOG_MAX_CACHED_SEARCHES + 2);
  });

  it("clears the search cache on reset", async () => {
    const harness = createHarness(() => ({ body: searchBody(["one"]) }));

    await harness.client.search({ query: "react" });
    harness.client.reset();
    await harness.client.search({ query: "react" });

    expect(harness.urls).toHaveLength(2);
  });
});
