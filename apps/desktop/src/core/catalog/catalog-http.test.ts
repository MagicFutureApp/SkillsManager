import { describe, expect, it, vi } from "vitest";

import {
  buildManifestUrl,
  buildPageUrl,
  buildSearchUrl,
  CATALOG_SEARCH_DEFAULT_LIMIT,
  CATALOG_SEARCH_MAX_LIMIT,
  CATALOG_SEARCH_MIN_LIMIT,
  CatalogHttpError,
  DEFAULT_RETRY_AFTER_SECONDS,
  fetchCatalogManifest,
  fetchCatalogPage,
  fetchCatalogSearch,
  isValidSearchOwner,
  MAX_RETRY_AFTER_SECONDS,
  MIN_RETRY_AFTER_SECONDS,
  normalizeCatalogSearch,
  normalizeSearchQuery,
  parseRetryAfterSeconds,
  resolveSearchLimit
} from "./catalog-http";

const BASE_URL = "https://catalog.example.dev";

type FakeResponseInit = {
  status?: number;
  headers?: Record<string, string>;
  json?: () => Promise<unknown>;
};

const createResponse = (init: FakeResponseInit = {}): Response => {
  const status = init.status ?? 200;
  const headers = new Map(
    Object.entries(init.headers ?? {}).map(([key, value]) => [key.toLowerCase(), value])
  );

  return {
    ok: status >= 200 && status < 300,
    status,
    headers: {
      get: (name: string): string | null => headers.get(name.toLowerCase()) ?? null
    },
    json: init.json ?? ((): Promise<unknown> => Promise.resolve({}))
  } as unknown as Response;
};

const createFetchStub = (
  handler: (url: string, callIndex: number) => Promise<Response> | Response
) => {
  const urls: string[] = [];
  const mock = vi.fn(async (input: unknown): Promise<Response> => {
    const url = String(input);
    const response = await handler(url, urls.length);

    urls.push(url);

    return response;
  });

  return { urls, mock, fetchImpl: mock as unknown as typeof fetch };
};

const manifestPayload = {
  schemaVersion: 1,
  current: {
    generation: "gen-current",
    generatedAt: "2026-08-04T00:00:00.000Z",
    pageCount: 4,
    perPage: 500,
    total: 1800,
    view: "all-time"
  },
  previous: {
    generation: "gen-previous",
    generatedAt: "2026-08-03T00:00:00.000Z",
    pageCount: 3,
    perPage: 500,
    total: 1400,
    view: "all-time"
  }
};

describe("catalog URL building", () => {
  it("builds the manifest URL from the base URL", () => {
    expect(buildManifestUrl(BASE_URL)).toBe("https://catalog.example.dev/v1/catalog");
  });

  it("normalizes trailing slashes on the base URL", () => {
    expect(buildManifestUrl("https://catalog.example.dev///")).toBe(
      "https://catalog.example.dev/v1/catalog"
    );
    expect(buildPageUrl("https://catalog.example.dev/", "gen-1", 2)).toBe(
      "https://catalog.example.dev/v1/catalog/gen-1/pages/2"
    );
  });

  it("percent-encodes the generation segment", () => {
    expect(buildPageUrl(BASE_URL, "gen/../evil 1", 0)).toBe(
      "https://catalog.example.dev/v1/catalog/gen%2F..%2Fevil%201/pages/0"
    );
  });
});

describe("parseRetryAfterSeconds", () => {
  it("parses the delta-seconds form", () => {
    expect(parseRetryAfterSeconds("2")).toBe(2);
  });

  it("clamps to the lower bound", () => {
    expect(parseRetryAfterSeconds("0")).toBe(MIN_RETRY_AFTER_SECONDS);
    expect(parseRetryAfterSeconds("-30")).toBe(MIN_RETRY_AFTER_SECONDS);
  });

  it("clamps to the upper bound", () => {
    expect(parseRetryAfterSeconds("999")).toBe(MAX_RETRY_AFTER_SECONDS);
  });

  it("falls back to the default for missing or malformed values", () => {
    expect(parseRetryAfterSeconds(null)).toBe(DEFAULT_RETRY_AFTER_SECONDS);
    expect(parseRetryAfterSeconds("")).toBe(DEFAULT_RETRY_AFTER_SECONDS);
    expect(parseRetryAfterSeconds("abc")).toBe(DEFAULT_RETRY_AFTER_SECONDS);
  });
});

describe("fetchCatalogManifest", () => {
  it("returns a normalized manifest on 200", async () => {
    const { fetchImpl, urls } = createFetchStub(() =>
      createResponse({ json: () => Promise.resolve(manifestPayload) })
    );

    const manifest = await fetchCatalogManifest({ baseUrl: BASE_URL, fetchImpl, timeoutMs: 5000 });

    expect(urls).toEqual(["https://catalog.example.dev/v1/catalog"]);
    expect(manifest.current.generation).toBe("gen-current");
    expect(manifest.previous?.generation).toBe("gen-previous");
  });

  it("maps 202 to a warming error carrying the retry-after delay", async () => {
    const { fetchImpl } = createFetchStub(() =>
      createResponse({ status: 202, headers: { "retry-after": "4" } })
    );

    const error = await fetchCatalogManifest({
      baseUrl: BASE_URL,
      fetchImpl,
      timeoutMs: 5000
    }).catch((thrown: unknown) => thrown);

    expect(error).toBeInstanceOf(CatalogHttpError);
    expect((error as CatalogHttpError).code).toBe("warming");
    expect((error as CatalogHttpError).retryAfterSeconds).toBe(4);
  });

  it("maps other non-2xx statuses to network errors", async () => {
    const { fetchImpl } = createFetchStub(() => createResponse({ status: 500 }));

    await expect(
      fetchCatalogManifest({ baseUrl: BASE_URL, fetchImpl, timeoutMs: 5000 })
    ).rejects.toMatchObject({ code: "network" });
  });

  it("maps a rejected fetch to a network error", async () => {
    const { fetchImpl } = createFetchStub(() => {
      throw new Error("ECONNREFUSED");
    });

    await expect(
      fetchCatalogManifest({ baseUrl: BASE_URL, fetchImpl, timeoutMs: 5000 })
    ).rejects.toMatchObject({ code: "network" });
  });

  it("rejects a manifest without a usable current generation", async () => {
    const { fetchImpl } = createFetchStub(() =>
      createResponse({ json: () => Promise.resolve({ schemaVersion: 1 }) })
    );

    await expect(
      fetchCatalogManifest({ baseUrl: BASE_URL, fetchImpl, timeoutMs: 5000 })
    ).rejects.toMatchObject({ code: "invalid-response" });
  });

  it("drops a malformed previous snapshot instead of failing the whole manifest", async () => {
    const { fetchImpl } = createFetchStub(() =>
      createResponse({
        json: () =>
          Promise.resolve({
            schemaVersion: 1,
            current: manifestPayload.current,
            previous: { generation: 42 }
          })
      })
    );

    const manifest = await fetchCatalogManifest({ baseUrl: BASE_URL, fetchImpl, timeoutMs: 5000 });

    expect(manifest.previous).toBeUndefined();
  });
});

describe("fetchCatalogPage", () => {
  it("requests the generation-scoped page URL", async () => {
    const { fetchImpl, urls } = createFetchStub(() =>
      createResponse({
        json: () =>
          Promise.resolve({
            data: [],
            pagination: { page: 3, perPage: 500, total: 1800, hasMore: true }
          })
      })
    );

    const page = await fetchCatalogPage({
      baseUrl: BASE_URL,
      fetchImpl,
      timeoutMs: 5000,
      generation: "gen-current",
      page: 3
    });

    expect(urls).toEqual(["https://catalog.example.dev/v1/catalog/gen-current/pages/3"]);
    expect(page.pagination).toEqual({ page: 3, perPage: 500, total: 1800, hasMore: true });
  });

  it("maps 404 to a not-found error", async () => {
    const { fetchImpl } = createFetchStub(() => createResponse({ status: 404 }));

    await expect(
      fetchCatalogPage({
        baseUrl: BASE_URL,
        fetchImpl,
        timeoutMs: 5000,
        generation: "gen-current",
        page: 0
      })
    ).rejects.toMatchObject({ code: "not-found" });
  });

  it("maps 503 to an unavailable error", async () => {
    const { fetchImpl } = createFetchStub(() => createResponse({ status: 503 }));

    await expect(
      fetchCatalogPage({
        baseUrl: BASE_URL,
        fetchImpl,
        timeoutMs: 5000,
        generation: "gen-current",
        page: 0
      })
    ).rejects.toMatchObject({ code: "unavailable" });
  });

  it("maps an unparsable body to invalid-response", async () => {
    const { fetchImpl } = createFetchStub(() =>
      createResponse({
        json: () => Promise.reject(new Error("Unexpected token < in JSON"))
      })
    );

    await expect(
      fetchCatalogPage({
        baseUrl: BASE_URL,
        fetchImpl,
        timeoutMs: 5000,
        generation: "gen-current",
        page: 0
      })
    ).rejects.toMatchObject({ code: "invalid-response" });
  });

  it("rejects a payload whose data field is not an array", async () => {
    const { fetchImpl } = createFetchStub(() =>
      createResponse({ json: () => Promise.resolve({ data: "nope" }) })
    );

    await expect(
      fetchCatalogPage({
        baseUrl: BASE_URL,
        fetchImpl,
        timeoutMs: 5000,
        generation: "gen-current",
        page: 0
      })
    ).rejects.toMatchObject({ code: "invalid-response" });
  });

  it("drops entries without a string id and defaults the remaining fields", async () => {
    const { fetchImpl } = createFetchStub(() =>
      createResponse({
        json: () =>
          Promise.resolve({
            data: [
              { id: 123, name: "numeric id" },
              null,
              { id: "keep-me" },
              {
                id: "full",
                slug: "full-slug",
                name: "Full",
                source: "acme/full",
                installs: 42,
                sourceType: "github",
                installUrl: "https://example.dev/install",
                url: "https://example.dev/full"
              },
              { id: "weird", installs: "many", sourceType: "martian", installUrl: 7 }
            ]
          })
      })
    );

    const page = await fetchCatalogPage({
      baseUrl: BASE_URL,
      fetchImpl,
      timeoutMs: 5000,
      generation: "gen-current",
      page: 0
    });

    expect(page.data).toHaveLength(3);
    expect(page.data[0]).toEqual({
      id: "keep-me",
      slug: "",
      name: "",
      source: "",
      installs: 0,
      sourceType: "well-known",
      installUrl: null,
      url: ""
    });
    expect(page.data[1]).toMatchObject({ id: "full", sourceType: "github", installs: 42 });
    expect(page.data[2]).toMatchObject({
      id: "weird",
      installs: 0,
      sourceType: "well-known",
      installUrl: null
    });
    expect(page.pagination).toEqual({ page: 0, perPage: 3, total: 3, hasMore: false });
  });
});

describe("search input helpers", () => {
  it("trims and collapses whitespace in a query", () => {
    expect(normalizeSearchQuery("  react   native ")).toBe("react native");
    expect(normalizeSearchQuery("\treact\n")).toBe("react");
    expect(normalizeSearchQuery("   ")).toBe("");
  });

  it("accepts legal GitHub owners and rejects the rest", () => {
    expect(isValidSearchOwner("expo")).toBe(true);
    expect(isValidSearchOwner("vercel-labs")).toBe(true);
    expect(isValidSearchOwner("a.b_c-1")).toBe(true);
    expect(isValidSearchOwner("a/b")).toBe(false);
    expect(isValidSearchOwner("-leading")).toBe(false);
    expect(isValidSearchOwner("")).toBe(false);
    expect(isValidSearchOwner("a".repeat(101))).toBe(false);
  });

  it("clamps the limit instead of rejecting it", () => {
    expect(resolveSearchLimit(undefined)).toBe(CATALOG_SEARCH_DEFAULT_LIMIT);
    expect(resolveSearchLimit(Number.NaN)).toBe(CATALOG_SEARCH_DEFAULT_LIMIT);
    expect(resolveSearchLimit(Number.POSITIVE_INFINITY)).toBe(CATALOG_SEARCH_DEFAULT_LIMIT);
    expect(resolveSearchLimit(0)).toBe(CATALOG_SEARCH_MIN_LIMIT);
    expect(resolveSearchLimit(-10)).toBe(CATALOG_SEARCH_MIN_LIMIT);
    expect(resolveSearchLimit(500)).toBe(CATALOG_SEARCH_MAX_LIMIT);
    expect(resolveSearchLimit(20.9)).toBe(20);
  });
});

describe("buildSearchUrl", () => {
  it("encodes the query and appends the limit", () => {
    expect(buildSearchUrl(BASE_URL, { query: "react native", limit: 50 })).toBe(
      `${BASE_URL}/v1/catalog/search?q=react%20native&limit=50`
    );
  });

  it("encodes characters that would otherwise break the query string", () => {
    expect(buildSearchUrl(BASE_URL, { query: "a&b=c?d#e", limit: 10 })).toBe(
      `${BASE_URL}/v1/catalog/search?q=a%26b%3Dc%3Fd%23e&limit=10`
    );
  });

  it("appends the owner only when one is provided", () => {
    expect(buildSearchUrl(BASE_URL, { query: "react", limit: 50, owner: "expo" })).toBe(
      `${BASE_URL}/v1/catalog/search?q=react&limit=50&owner=expo`
    );
    expect(buildSearchUrl(BASE_URL, { query: "react", limit: 50, owner: "" })).toBe(
      `${BASE_URL}/v1/catalog/search?q=react&limit=50`
    );
  });

  it("normalizes a base URL with trailing slashes", () => {
    expect(buildSearchUrl(`${BASE_URL}///`, { query: "react", limit: 50 })).toBe(
      `${BASE_URL}/v1/catalog/search?q=react&limit=50`
    );
  });
});

describe("normalizeCatalogSearch", () => {
  it("rejects a payload without a data array", () => {
    expect(() => normalizeCatalogSearch({ query: "react" })).toThrow(CatalogHttpError);
    expect(() => normalizeCatalogSearch(null)).toThrow(CatalogHttpError);
    expect(() => normalizeCatalogSearch({ data: "nope" })).toThrow(CatalogHttpError);
  });

  it("drops entries without a usable id and recounts", () => {
    const payload = normalizeCatalogSearch({
      data: [{ id: "keep" }, { id: "" }, { name: "no id" }, null, 7, { id: "keep-too" }],
      query: "react",
      searchType: "fuzzy",
      count: 6
    });

    expect(payload.data.map((entry) => entry.id)).toEqual(["keep", "keep-too"]);
    expect(payload.count).toBe(2);
  });

  it("treats any unknown searchType as semantic", () => {
    expect(normalizeCatalogSearch({ data: [], searchType: "fuzzy" }).searchType).toBe("fuzzy");
    expect(normalizeCatalogSearch({ data: [], searchType: "semantic" }).searchType).toBe(
      "semantic"
    );
    expect(normalizeCatalogSearch({ data: [], searchType: "telepathic" }).searchType).toBe(
      "semantic"
    );
    expect(normalizeCatalogSearch({ data: [] }).searchType).toBe("semantic");
  });

  it("keeps isDuplicate only when upstream sets it to true", () => {
    const payload = normalizeCatalogSearch({
      data: [
        { id: "fork", isDuplicate: true },
        { id: "original" },
        { id: "falsy", isDuplicate: false }
      ],
      searchType: "fuzzy"
    });

    expect(payload.data[0]).toMatchObject({ id: "fork", isDuplicate: true });
    expect(payload.data[1]).not.toHaveProperty("isDuplicate");
    expect(payload.data[2]).not.toHaveProperty("isDuplicate");
  });

  it("falls back to an empty echoed query when the server omits it", () => {
    expect(normalizeCatalogSearch({ data: [] }).query).toBe("");
    expect(normalizeCatalogSearch({ data: [], query: 42 }).query).toBe("");
    expect(normalizeCatalogSearch({ data: [], query: "react" }).query).toBe("react");
  });
});

describe("fetchCatalogSearch", () => {
  it("requests the search endpoint and returns the projected payload", async () => {
    const { urls, fetchImpl } = createFetchStub(() =>
      createResponse({
        json: () =>
          Promise.resolve({
            data: [{ id: "acme/repo/skill", name: "Skill", installs: 5, sourceType: "github" }],
            query: "react",
            searchType: "fuzzy",
            count: 1
          })
      })
    );

    const payload = await fetchCatalogSearch({
      baseUrl: BASE_URL,
      fetchImpl,
      timeoutMs: 5000,
      query: "react",
      limit: 50
    });

    expect(urls).toEqual([`${BASE_URL}/v1/catalog/search?q=react&limit=50`]);
    expect(payload).toEqual({
      data: [
        {
          id: "acme/repo/skill",
          slug: "",
          name: "Skill",
          source: "",
          installs: 5,
          sourceType: "github",
          installUrl: null,
          url: ""
        }
      ],
      query: "react",
      searchType: "fuzzy",
      count: 1
    });
  });

  it("classifies a 400 as invalid-query", async () => {
    const { fetchImpl } = createFetchStub(() => createResponse({ status: 400 }));

    await expect(
      fetchCatalogSearch({
        baseUrl: BASE_URL,
        fetchImpl,
        timeoutMs: 5000,
        query: "react",
        limit: 50
      })
    ).rejects.toMatchObject({ name: "CatalogHttpError", code: "invalid-query" });
  });

  it("classifies a 429 as rate-limited and carries the clamped Retry-After", async () => {
    const { fetchImpl } = createFetchStub(() =>
      createResponse({ status: 429, headers: { "retry-after": "3" } })
    );

    await expect(
      fetchCatalogSearch({
        baseUrl: BASE_URL,
        fetchImpl,
        timeoutMs: 5000,
        query: "react",
        limit: 50
      })
    ).rejects.toMatchObject({ code: "rate-limited", retryAfterSeconds: 3 });
  });

  it("clamps an absurd Retry-After on a 429", async () => {
    const { fetchImpl } = createFetchStub(() =>
      createResponse({ status: 429, headers: { "retry-after": "999" } })
    );

    await expect(
      fetchCatalogSearch({
        baseUrl: BASE_URL,
        fetchImpl,
        timeoutMs: 5000,
        query: "react",
        limit: 50
      })
    ).rejects.toMatchObject({ code: "rate-limited", retryAfterSeconds: MAX_RETRY_AFTER_SECONDS });
  });

  it("classifies a 503 as unavailable", async () => {
    const { fetchImpl } = createFetchStub(() => createResponse({ status: 503 }));

    await expect(
      fetchCatalogSearch({
        baseUrl: BASE_URL,
        fetchImpl,
        timeoutMs: 5000,
        query: "react",
        limit: 50
      })
    ).rejects.toMatchObject({ code: "unavailable" });
  });

  it("classifies a malformed JSON body as invalid-response", async () => {
    const { fetchImpl } = createFetchStub(() =>
      createResponse({ json: () => Promise.reject(new Error("not json")) })
    );

    await expect(
      fetchCatalogSearch({
        baseUrl: BASE_URL,
        fetchImpl,
        timeoutMs: 5000,
        query: "react",
        limit: 50
      })
    ).rejects.toMatchObject({ code: "invalid-response" });
  });
});
