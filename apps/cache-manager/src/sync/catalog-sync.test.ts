import { describe, expect, it, vi } from "vitest";

import { catalogManifestKey, catalogPageKey, catalogStatusKey } from "../catalog/keys";
import type { CatalogManifest, CatalogSyncStatus } from "../catalog/types";
import type { SkillsShTokenProvider } from "../security/skills-sh-token";
import { createUnsignedJwt } from "../test/create-jwt";
import { MemoryKv } from "../test/memory-kv";
import { syncCatalog } from "./catalog-sync";

const tokenProvider: SkillsShTokenProvider = {
  getToken: vi.fn().mockResolvedValue("oidc-token"),
  invalidate: vi.fn()
};

const pageResponse = (page: number, total: number, hasMore: boolean): Response =>
  new Response(
    JSON.stringify({
      data: [
        {
          id: `owner/repo/skill-${page}`,
          slug: `skill-${page}`,
          name: `Skill ${page}`,
          source: "owner/repo",
          installs: page,
          sourceType: "github",
          installUrl: "https://github.com/owner/repo",
          url: `https://skills.sh/owner/repo/skill-${page}`
        }
      ],
      pagination: { page, perPage: 500, total, hasMore }
    }),
    {
      headers: {
        "content-type": "application/json",
        "x-catalog-page": String(page),
        "x-catalog-per-page": "500",
        "x-catalog-total": String(total),
        "x-catalog-has-more": String(hasMore)
      }
    }
  );

describe("syncCatalog", () => {
  it("gets one Vercel token and fetches catalog data directly from skills.sh", async () => {
    const kv = new MemoryKv();
    const currentTime = new Date("2026-07-29T00:00:00.000Z");
    const expiresAt = Math.floor(currentTime.getTime() / 1_000) + 3_600;
    const token = createUnsignedJwt(expiresAt);
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json({ token, expiresAt }))
      .mockResolvedValueOnce(pageResponse(0, 1, false));

    await syncCatalog(
      {
        SKILLS_SH_CACHE: kv,
        SKILLS_SH_TOKEN_URL: "https://token.example/api/token",
        SKILLS_SH_TOKEN_SECRET: "token-secret",
        CACHE_ADMIN_TOKEN: "admin-secret"
      },
      {
        fetchImpl,
        now: () => currentTime,
        createGeneration: () => "direct-generation"
      }
    );

    expect(fetchImpl).toHaveBeenNthCalledWith(1, "https://token.example/api/token", {
      method: "POST",
      headers: { authorization: "Bearer token-secret" }
    });
    expect(fetchImpl).toHaveBeenNthCalledWith(
      2,
      "https://skills.sh/api/v1/skills?view=all-time&page=0&per_page=500",
      { headers: { authorization: `Bearer ${token}` } }
    );
  });

  it("publishes the manifest only after every catalog page is stored", async () => {
    const kv = new MemoryKv();
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(pageResponse(0, 501, true))
      .mockResolvedValueOnce(pageResponse(1, 501, false));

    const manifest = await syncCatalog(
      {
        SKILLS_SH_CACHE: kv,
        SKILLS_SH_TOKEN_URL: "https://token.example/api/token",
        SKILLS_SH_TOKEN_SECRET: "token-secret",
        CACHE_ADMIN_TOKEN: "admin-secret"
      },
      {
        fetchImpl,
        now: () => new Date("2026-07-29T00:00:00.000Z"),
        createGeneration: () => "generation-2",
        tokenProvider
      }
    );

    expect(manifest.current).toMatchObject({
      generation: "generation-2",
      pageCount: 2,
      total: 501
    });
    expect(kv.values.has(catalogPageKey("generation-2", 0))).toBe(true);
    expect(kv.values.has(catalogPageKey("generation-2", 1))).toBe(true);
    expect(JSON.parse(kv.values.get(catalogManifestKey) ?? "null")).toEqual(manifest);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(kv.operations.indexOf(`put:${catalogManifestKey}`)).toBeGreaterThan(
      kv.operations.indexOf(`put:${catalogPageKey("generation-2", 1)}`)
    );
  });

  it("keeps the current manifest when a later page fails", async () => {
    const kv = new MemoryKv();
    const existingManifest: CatalogManifest = {
      schemaVersion: 1,
      current: {
        generation: "generation-1",
        generatedAt: "2026-07-28T18:00:00.000Z",
        pageCount: 2,
        perPage: 500,
        total: 501,
        view: "all-time"
      }
    };
    kv.values.set(catalogManifestKey, JSON.stringify(existingManifest));
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(pageResponse(0, 501, true))
      .mockResolvedValueOnce(new Response("upstream unavailable", { status: 503 }));

    await expect(
      syncCatalog(
        {
          SKILLS_SH_CACHE: kv,
          SKILLS_SH_TOKEN_URL: "https://token.example/api/token",
          SKILLS_SH_TOKEN_SECRET: "token-secret",
          CACHE_ADMIN_TOKEN: "admin-secret"
        },
        {
          fetchImpl,
          now: () => new Date("2026-07-29T00:00:00.000Z"),
          createGeneration: () => "failed-generation",
          tokenProvider
        }
      )
    ).rejects.toThrow("skills.sh returned 503");

    expect(JSON.parse(kv.values.get(catalogManifestKey) ?? "null")).toEqual(existingManifest);
    expect(kv.values.has(catalogPageKey("failed-generation", 0))).toBe(false);
    const status = JSON.parse(kv.values.get(catalogStatusKey) ?? "null") as CatalogSyncStatus;
    expect(status).toMatchObject({ status: "error", lastSuccessAt: null });
  });

  it("retains the current and previous generations and deletes the older generation", async () => {
    const kv = new MemoryKv();
    const existingManifest: CatalogManifest = {
      schemaVersion: 1,
      current: {
        generation: "generation-2",
        generatedAt: "2026-07-28T18:00:00.000Z",
        pageCount: 1,
        perPage: 500,
        total: 1,
        view: "all-time"
      },
      previous: {
        generation: "generation-1",
        generatedAt: "2026-07-28T12:00:00.000Z",
        pageCount: 1,
        perPage: 500,
        total: 1,
        view: "all-time"
      }
    };
    kv.values.set(catalogManifestKey, JSON.stringify(existingManifest));
    kv.values.set(catalogPageKey("generation-1", 0), "old page");

    const manifest = await syncCatalog(
      {
        SKILLS_SH_CACHE: kv,
        SKILLS_SH_TOKEN_URL: "https://token.example/api/token",
        SKILLS_SH_TOKEN_SECRET: "token-secret",
        CACHE_ADMIN_TOKEN: "admin-secret"
      },
      {
        fetchImpl: vi.fn<typeof fetch>().mockResolvedValue(pageResponse(0, 1, false)),
        now: () => new Date("2026-07-29T00:00:00.000Z"),
        createGeneration: () => "generation-3",
        tokenProvider
      }
    );

    expect(manifest.current.generation).toBe("generation-3");
    expect(manifest.previous?.generation).toBe("generation-2");
    expect(kv.deletedKeys).toContain(catalogPageKey("generation-1", 0));
  });
});
