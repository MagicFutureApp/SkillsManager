import { ipcMain } from "electron";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getCatalogManifest, getCatalogPage, registerCatalogIpc, searchCatalog } from "./catalog";
import type { CatalogClient } from "../../core/catalog/catalog-client";
import type {
  CatalogManifestResult,
  CatalogPageResult,
  CatalogResult,
  CatalogSearchResult
} from "../../core/catalog/catalog-types";

vi.mock("electron", () => ({
  ipcMain: {
    handle: vi.fn()
  }
}));

const generation = {
  generation: "gen-a",
  generatedAt: "2026-08-04T00:00:00.000Z",
  pageCount: 4,
  total: 2000,
  isFallback: false
};

const searchData: CatalogSearchResult = {
  query: "react hooks",
  skills: [],
  searchType: "semantic",
  count: 0,
  truncated: false
};

const createClientStub = (overrides: Partial<CatalogClient> = {}): CatalogClient => ({
  getManifest: vi.fn(
    async (): Promise<CatalogResult<CatalogManifestResult>> => ({
      ok: true,
      data: { generation }
    })
  ),
  getPage: vi.fn(
    async (): Promise<CatalogResult<CatalogPageResult>> => ({
      ok: true,
      data: { page: 0, skills: [], generation }
    })
  ),
  search: vi.fn(
    async (): Promise<CatalogResult<CatalogSearchResult>> => ({
      ok: true,
      data: searchData
    })
  ),
  reset: vi.fn(),
  ...overrides
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

describe("getCatalogManifest", () => {
  it("passes a successful client result through untouched", async () => {
    const client = createClientStub();

    await expect(getCatalogManifest(client)).resolves.toEqual({
      ok: true,
      data: { generation }
    });
  });

  it("passes a client failure through untouched", async () => {
    const client = createClientStub({
      getManifest: vi.fn(
        async (): Promise<CatalogResult<CatalogManifestResult>> => ({
          ok: false,
          error: { code: "warming", message: "still warming", retryAfterSeconds: 3 }
        })
      )
    });

    await expect(getCatalogManifest(client)).resolves.toEqual({
      ok: false,
      error: { code: "warming", message: "still warming", retryAfterSeconds: 3 }
    });
  });

  it("never rejects when the client throws", async () => {
    const client = createClientStub({
      getManifest: vi.fn(async (): Promise<CatalogResult<CatalogManifestResult>> => {
        throw new Error("client exploded");
      })
    });

    await expect(getCatalogManifest(client)).resolves.toEqual({
      ok: false,
      error: { code: "unknown", message: "client exploded" }
    });
  });
});

describe("getCatalogPage", () => {
  it("forwards a valid page request to the client", async () => {
    const client = createClientStub();

    await expect(getCatalogPage(client, { page: 2, forceRefresh: true })).resolves.toMatchObject({
      ok: true
    });
    expect(client.getPage).toHaveBeenCalledWith({ page: 2, forceRefresh: true });
  });

  it("defaults forceRefresh to false", async () => {
    const client = createClientStub();

    await getCatalogPage(client, { page: 0 });

    expect(client.getPage).toHaveBeenCalledWith({ page: 0, forceRefresh: false });
  });

  it.each([
    ["negative page", { page: -1 }],
    ["fractional page", { page: 1.5 }],
    ["string page", { page: "0" }],
    ["missing page", {}],
    ["null input", null],
    ["undefined input", undefined],
    ["primitive input", 3]
  ])("rejects %s without calling the client", async (_label, input) => {
    const client = createClientStub();

    await expect(getCatalogPage(client, input)).resolves.toEqual({
      ok: false,
      error: { code: "not-found", message: "Invalid catalog page index." }
    });
    expect(client.getPage).not.toHaveBeenCalled();
  });

  it("passes a client failure through untouched", async () => {
    const client = createClientStub({
      getPage: vi.fn(
        async (): Promise<CatalogResult<CatalogPageResult>> => ({
          ok: false,
          error: { code: "unavailable", message: "no snapshot" }
        })
      )
    });

    await expect(getCatalogPage(client, { page: 0 })).resolves.toEqual({
      ok: false,
      error: { code: "unavailable", message: "no snapshot" }
    });
  });

  it("never rejects when the client throws", async () => {
    const client = createClientStub({
      getPage: vi.fn(async (): Promise<CatalogResult<CatalogPageResult>> => {
        throw new Error("page exploded");
      })
    });

    await expect(getCatalogPage(client, { page: 0 })).resolves.toEqual({
      ok: false,
      error: { code: "unknown", message: "page exploded" }
    });
  });
});

describe("searchCatalog", () => {
  it("forwards a minimal valid query to the client untouched", async () => {
    const client = createClientStub();

    await expect(searchCatalog(client, { query: "  React Hooks  " })).resolves.toEqual({
      ok: true,
      data: searchData
    });
    // Trimming is the client's job, so the raw string must arrive unchanged.
    expect(client.search).toHaveBeenCalledWith({ query: "  React Hooks  " });
  });

  it("forwards limit and owner when they are well typed", async () => {
    const client = createClientStub();

    await searchCatalog(client, { query: "react", limit: 10, owner: "Anthropics" });

    expect(client.search).toHaveBeenCalledWith({
      query: "react",
      limit: 10,
      owner: "Anthropics"
    });
  });

  it.each([
    ["null limit", { query: "react", limit: null }],
    ["undefined limit", { query: "react", limit: undefined }],
    ["null owner", { query: "react", owner: null }],
    ["undefined owner", { query: "react", owner: undefined }]
  ])("treats %s as absent instead of rejecting", async (_label, input) => {
    const client = createClientStub();

    await expect(searchCatalog(client, input)).resolves.toMatchObject({ ok: true });
    expect(client.search).toHaveBeenCalledWith({ query: "react" });
  });

  it("passes out-of-range limits through so the client can clamp them", async () => {
    const client = createClientStub();

    await searchCatalog(client, { query: "react", limit: 5000 });

    expect(client.search).toHaveBeenCalledWith({ query: "react", limit: 5000 });
  });

  it.each([
    ["missing query", {}],
    ["numeric query", { query: 42 }],
    ["null query", { query: null }],
    ["string limit", { query: "react", limit: "10" }],
    ["NaN limit", { query: "react", limit: Number.NaN }],
    ["Infinity limit", { query: "react", limit: Number.POSITIVE_INFINITY }],
    ["numeric owner", { query: "react", owner: 7 }],
    ["null input", null],
    ["undefined input", undefined],
    ["primitive input", "react"],
    ["array input", ["react"]]
  ])("rejects %s as invalid-query without calling the client", async (_label, input) => {
    const client = createClientStub();

    await expect(searchCatalog(client, input)).resolves.toEqual({
      ok: false,
      error: { code: "invalid-query", message: "Invalid catalog search input." }
    });
    expect(client.search).not.toHaveBeenCalled();
  });

  it("passes a client failure through untouched", async () => {
    const client = createClientStub({
      search: vi.fn(
        async (): Promise<CatalogResult<CatalogSearchResult>> => ({
          ok: false,
          error: { code: "rate-limited", message: "too many requests", retryAfterSeconds: 3 }
        })
      )
    });

    await expect(searchCatalog(client, { query: "react" })).resolves.toEqual({
      ok: false,
      error: { code: "rate-limited", message: "too many requests", retryAfterSeconds: 3 }
    });
  });

  it("never rejects when the client throws", async () => {
    const client = createClientStub({
      search: vi.fn(async (): Promise<CatalogResult<CatalogSearchResult>> => {
        throw new Error("search exploded");
      })
    });

    await expect(searchCatalog(client, { query: "react" })).resolves.toEqual({
      ok: false,
      error: { code: "unknown", message: "search exploded" }
    });
  });
});

describe("registerCatalogIpc", () => {
  it("registers exactly the three catalog channels", () => {
    registerCatalogIpc(createClientStub());

    const handleMock = vi.mocked(ipcMain.handle);
    const channels = handleMock.mock.calls.map(([channel]) => channel);

    expect(channels).toEqual(["catalog:getManifest", "catalog:getPage", "catalog:search"]);
  });

  it("wires the registered handlers to the provided client", async () => {
    const client = createClientStub();

    registerCatalogIpc(client);

    const handleMock = vi.mocked(ipcMain.handle);
    const manifestHandler = handleMock.mock.calls[0]?.[1];
    const pageHandler = handleMock.mock.calls[1]?.[1];
    const searchHandler = handleMock.mock.calls[2]?.[1];

    expect(manifestHandler).toBeTypeOf("function");
    expect(pageHandler).toBeTypeOf("function");
    expect(searchHandler).toBeTypeOf("function");

    const event = {} as Electron.IpcMainInvokeEvent;

    await expect(manifestHandler?.(event)).resolves.toMatchObject({ ok: true });
    await expect(pageHandler?.(event, { page: 1 })).resolves.toMatchObject({ ok: true });
    await expect(searchHandler?.(event, { query: "react" })).resolves.toMatchObject({ ok: true });
    expect(client.getPage).toHaveBeenCalledWith({ page: 1, forceRefresh: false });
    expect(client.search).toHaveBeenCalledWith({ query: "react" });
  });

  it("never rejects through the registered search channel on malformed input", async () => {
    registerCatalogIpc(createClientStub());

    const handleMock = vi.mocked(ipcMain.handle);
    const searchHandler = handleMock.mock.calls[2]?.[1];
    const event = {} as Electron.IpcMainInvokeEvent;

    await expect(searchHandler?.(event, undefined)).resolves.toEqual({
      ok: false,
      error: { code: "invalid-query", message: "Invalid catalog search input." }
    });
  });
});
