import { catalogManifestKey, catalogPageKey, catalogStatusKey } from "../catalog/keys";
import {
  catalogPageSize,
  catalogView,
  parseCatalogManifest,
  parseCatalogSyncStatus,
  type CatalogManifest,
  type CatalogSyncStatus
} from "../catalog/types";
import type { WorkerBindings } from "../worker-env";
import {
  createSkillsShTokenProvider,
  type SkillsShTokenProvider
} from "../security/skills-sh-token";
import { fetchCatalogPage } from "./catalog-client";

type SyncDependencies = {
  fetchImpl?: typeof fetch;
  now?: () => Date;
  createGeneration?: () => string;
  tokenProvider?: SkillsShTokenProvider;
};

const defaultGeneration = (): string => crypto.randomUUID();

const writeStatus = async (bindings: WorkerBindings, status: CatalogSyncStatus): Promise<void> => {
  try {
    await bindings.SKILLS_SH_CACHE.put(catalogStatusKey, JSON.stringify(status));
  } catch {
    // Status is diagnostic metadata and must not invalidate a published catalog.
  }
};

const deleteGeneration = async (
  bindings: WorkerBindings,
  generation: string,
  pageCount: number
): Promise<void> => {
  await Promise.allSettled(
    Array.from({ length: pageCount }, (_, page) =>
      bindings.SKILLS_SH_CACHE.delete(catalogPageKey(generation, page))
    )
  );
};

const requireSyncConfiguration = (bindings: WorkerBindings): void => {
  if (!bindings.SKILLS_SH_TOKEN_URL || !bindings.SKILLS_SH_TOKEN_SECRET) {
    throw new Error("Token broker configuration is missing");
  }
};

export const syncCatalog = async (
  bindings: WorkerBindings,
  dependencies: SyncDependencies = {}
): Promise<CatalogManifest> => {
  requireSyncConfiguration(bindings);

  const fetchImpl = dependencies.fetchImpl ?? fetch;
  const now = dependencies.now ?? (() => new Date());
  const tokenProvider =
    dependencies.tokenProvider ?? createSkillsShTokenProvider({ fetchImpl, now });
  const createGeneration = dependencies.createGeneration ?? defaultGeneration;
  const attemptedAt = now().toISOString();
  const generation = createGeneration();
  const currentManifest = parseCatalogManifest(
    await bindings.SKILLS_SH_CACHE.get(catalogManifestKey)
  );
  const currentStatus = parseCatalogSyncStatus(
    await bindings.SKILLS_SH_CACHE.get(catalogStatusKey)
  );
  const writtenPageKeys: string[] = [];

  await writeStatus(bindings, {
    status: "syncing",
    lastAttemptAt: attemptedAt,
    lastSuccessAt: currentStatus?.lastSuccessAt ?? null,
    error: null
  });

  try {
    let page = 0;
    let total: number | null = null;

    while (true) {
      const catalogPage = await fetchCatalogPage(bindings, page, tokenProvider, fetchImpl);
      if (total !== null && catalogPage.total !== total) {
        throw new Error("Catalog total changed during synchronization");
      }
      total = catalogPage.total;

      const pageKey = catalogPageKey(generation, page);
      await bindings.SKILLS_SH_CACHE.put(pageKey, catalogPage.body);
      writtenPageKeys.push(pageKey);

      if (!catalogPage.hasMore) {
        break;
      }
      page += 1;
    }

    const snapshot = {
      generation,
      generatedAt: attemptedAt,
      pageCount: writtenPageKeys.length,
      perPage: catalogPageSize,
      total: total ?? 0,
      view: catalogView
    } as const;
    const manifest: CatalogManifest = {
      schemaVersion: 1,
      current: snapshot,
      ...(currentManifest ? { previous: currentManifest.current } : {})
    };

    await bindings.SKILLS_SH_CACHE.put(catalogManifestKey, JSON.stringify(manifest));
    await writeStatus(bindings, {
      status: "success",
      lastAttemptAt: attemptedAt,
      lastSuccessAt: attemptedAt,
      error: null,
      generation,
      pageCount: snapshot.pageCount,
      total: snapshot.total
    });

    if (currentManifest?.previous) {
      await deleteGeneration(
        bindings,
        currentManifest.previous.generation,
        currentManifest.previous.pageCount
      );
    }

    return manifest;
  } catch (error) {
    await Promise.allSettled(writtenPageKeys.map((key) => bindings.SKILLS_SH_CACHE.delete(key)));
    await writeStatus(bindings, {
      status: "error",
      lastAttemptAt: attemptedAt,
      lastSuccessAt: currentStatus?.lastSuccessAt ?? null,
      error: error instanceof Error ? error.message.slice(0, 300) : "Unknown catalog sync error"
    });
    throw error;
  }
};
