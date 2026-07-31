import { describe, expect, it, vi } from "vitest";

import { createApp } from "./app";
import { catalogManifestKey, catalogPageKey, catalogStatusKey } from "./catalog/keys";
import type { CatalogManifest, CatalogSyncStatus } from "./catalog/types";
import type { SkillsShTokenProvider } from "./security/skills-sh-token";
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
  CACHE_ADMIN_TOKEN: "admin-secret"
});

describe("cache manager API", () => {
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
