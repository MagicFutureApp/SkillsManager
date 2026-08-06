import { describe, expect, it } from "vitest";

import {
  buildSearchCacheKey,
  buildSkillsShSearchUrl,
  normalizeSearchQueryText,
  parseSearchQuery,
  projectSearchBody,
  searchDefaultLimit,
  searchMaxLimit,
  searchMinLimit,
  type SearchQueryParams
} from "./search-query";

const parse = (query: string) => parseSearchQuery(new URLSearchParams(query));

const params = (overrides: Partial<SearchQueryParams> = {}): SearchQueryParams => ({
  query: "react",
  limit: searchDefaultLimit,
  ...overrides
});

describe("normalizeSearchQueryText", () => {
  it("trims and collapses internal whitespace", () => {
    expect(normalizeSearchQueryText("  react   native \n")).toBe("react native");
  });

  it("returns an empty string for whitespace-only input", () => {
    expect(normalizeSearchQueryText("   ")).toBe("");
  });
});

describe("parseSearchQuery", () => {
  it("accepts a minimal valid query and applies the default limit", () => {
    expect(parse("q=react")).toEqual({
      ok: true,
      params: { query: "react", limit: searchDefaultLimit }
    });
  });

  it("normalizes the query before validating its length", () => {
    expect(parse("q=%20%20react%20%20native%20")).toMatchObject({
      ok: true,
      params: { query: "react native" }
    });
  });

  it.each([
    ["missing q", ""],
    ["empty q", "q="],
    ["single character", "q=r"],
    ["whitespace only", "q=%20%20"]
  ])("rejects %s with invalid_query", (_label, query) => {
    expect(parse(query)).toMatchObject({ ok: false, code: "invalid_query" });
  });

  it("rejects an over-long query", () => {
    expect(parse(`q=${"a".repeat(201)}`)).toMatchObject({ ok: false, code: "invalid_query" });
  });

  it("clamps the limit to the supported range instead of failing", () => {
    expect(parse("q=react&limit=9999")).toMatchObject({
      ok: true,
      params: { limit: searchMaxLimit }
    });
    expect(parse("q=react&limit=0")).toMatchObject({ ok: true, params: { limit: searchMinLimit } });
    expect(parse("q=react&limit=-5")).toMatchObject({
      ok: true,
      params: { limit: searchMinLimit }
    });
  });

  it.each([
    ["non numeric", "q=react&limit=abc"],
    ["fractional", "q=react&limit=1.5"],
    ["unsafe integer", "q=react&limit=99999999999999999999"]
  ])("rejects a %s limit with invalid_limit", (_label, query) => {
    expect(parse(query)).toMatchObject({ ok: false, code: "invalid_limit" });
  });

  it("treats an empty limit as the default", () => {
    expect(parse("q=react&limit=")).toMatchObject({
      ok: true,
      params: { limit: searchDefaultLimit }
    });
  });

  it("accepts and lower-cases a valid owner", () => {
    expect(parse("q=react&owner=Expo")).toMatchObject({
      ok: true,
      params: { owner: "expo" }
    });
  });

  it("omits the owner when it is absent or blank", () => {
    expect(parse("q=react")).toEqual({ ok: true, params: { query: "react", limit: 50 } });
    expect(parse("q=react&owner=%20")).toEqual({ ok: true, params: { query: "react", limit: 50 } });
  });

  it.each([
    ["path traversal", "q=react&owner=..%2Fetc"],
    ["slash", "q=react&owner=a%2Fb"],
    ["leading dash", "q=react&owner=-nope"],
    ["too long", `q=react&owner=${"a".repeat(101)}`]
  ])("rejects an %s owner with invalid_owner", (_label, query) => {
    expect(parse(query)).toMatchObject({ ok: false, code: "invalid_owner" });
  });
});

describe("buildSkillsShSearchUrl", () => {
  it("percent-encodes the query and appends the limit", () => {
    expect(buildSkillsShSearchUrl(params({ query: "react native" }))).toBe(
      "https://skills.sh/api/v1/skills/search?q=react%20native&limit=50"
    );
  });

  it("omits the owner parameter when it is not set", () => {
    expect(buildSkillsShSearchUrl(params())).not.toContain("owner=");
  });

  it("appends the owner when it is set", () => {
    expect(buildSkillsShSearchUrl(params({ owner: "expo", limit: 200 }))).toBe(
      "https://skills.sh/api/v1/skills/search?q=react&limit=200&owner=expo"
    );
  });
});

describe("buildSearchCacheKey", () => {
  it("lower-cases the query and always writes every parameter", () => {
    expect(buildSearchCacheKey(params({ query: "React Native" }))).toBe(
      "https://cache.internal/v1/catalog/search?q=react%20native&limit=50&owner="
    );
  });

  it("produces the same key for case and whitespace variants", () => {
    const first = parse("q=React");
    const second = parse("q=%20react%20");

    expect(first.ok && second.ok).toBe(true);

    if (!first.ok || !second.ok) return;

    expect(buildSearchCacheKey(first.params)).toBe(buildSearchCacheKey(second.params));
  });

  it("separates different owners and limits", () => {
    expect(buildSearchCacheKey(params({ owner: "expo" }))).not.toBe(buildSearchCacheKey(params()));
    expect(buildSearchCacheKey(params({ limit: 10 }))).not.toBe(buildSearchCacheKey(params()));
  });
});

describe("projectSearchBody", () => {
  const upstream = {
    data: [
      { id: "owner/repo/alpha", name: "Alpha", installs: 12 },
      { id: "owner/repo/beta", name: "Beta", isDuplicate: true }
    ],
    query: "react",
    searchType: "semantic",
    count: 2,
    durationMs: 42
  };

  it("keeps the client contract and drops durationMs", () => {
    const projected = projectSearchBody(JSON.stringify(upstream), params());

    expect(projected).not.toBeNull();
    expect(JSON.parse(projected as string)).toEqual({
      data: upstream.data,
      query: "react",
      searchType: "semantic",
      count: 2
    });
  });

  it("preserves isDuplicate on individual entries", () => {
    const projected = JSON.parse(projectSearchBody(JSON.stringify(upstream), params()) as string);

    expect(projected.data[1].isDuplicate).toBe(true);
  });

  it("drops entries without a usable id and recounts", () => {
    const projected = JSON.parse(
      projectSearchBody(
        JSON.stringify({
          data: [{ id: "keep" }, { id: 7 }, null, { id: "" }],
          query: "react",
          searchType: "fuzzy"
        }),
        params()
      ) as string
    );

    expect(projected.data).toEqual([{ id: "keep" }]);
    expect(projected.count).toBe(1);
  });

  it("falls back to the normalized query when upstream omits it", () => {
    const projected = JSON.parse(
      projectSearchBody(
        JSON.stringify({ data: [], searchType: "fuzzy" }),
        params({ query: "react native" })
      ) as string
    );

    expect(projected.query).toBe("react native");
  });

  it.each([
    ["unparsable", "not json"],
    ["array root", "[]"],
    ["missing data", JSON.stringify({ searchType: "fuzzy" })],
    ["non array data", JSON.stringify({ data: "nope", searchType: "fuzzy" })],
    ["missing searchType", JSON.stringify({ data: [] })],
    ["unknown searchType", JSON.stringify({ data: [], searchType: "magic" })]
  ])("returns null for a %s body", (_label, body) => {
    expect(projectSearchBody(body, params())).toBeNull();
  });
});
