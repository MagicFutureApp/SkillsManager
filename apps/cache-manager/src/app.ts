import { Hono, type Context } from "hono";

import { isCatalogFresh } from "./catalog/freshness";
import { catalogManifestKey, catalogPageKey, catalogStatusKey } from "./catalog/keys";
import {
  parseCatalogManifest,
  parseCatalogSyncStatus,
  type CatalogManifest,
  type CatalogSnapshot,
  type CatalogSyncStatus
} from "./catalog/types";
import { createDetailHandler, type ResponseCache } from "./details/detail-cache";
import { parseSkillReferencePath } from "./details/skill-detail";
import { createSearchHandler } from "./search/search-cache";
import { matchesBearerToken } from "./security/shared-secret";
import {
  createSkillsShTokenProvider,
  type SkillsShTokenProvider
} from "./security/skills-sh-token";
import { syncCatalog } from "./sync/catalog-sync";
import type { CacheManagerEnv, WorkerBindings } from "./worker-env";
import { workerFetch } from "./worker-fetch";

type CatalogSync = (bindings: WorkerBindings) => Promise<CatalogManifest>;

type AppDependencies = {
  detailCache?: ResponseCache;
  fetchImpl?: typeof fetch;
  now?: () => Date;
  searchCache?: ResponseCache;
  syncCatalogImpl?: CatalogSync;
  tokenProvider?: SkillsShTokenProvider;
  waitUntil?: (promise: Promise<unknown>) => void;
};

const getDefaultResponseCache = (): ResponseCache | undefined => {
  const cacheStorage = (
    globalThis as typeof globalThis & {
      caches?: CacheStorage & { default?: Cache };
    }
  ).caches;
  return cacheStorage?.default;
};

const catalogWarming = () =>
  Response.json(
    { status: "warming", message: "The catalog is being prepared. Retry shortly." },
    {
      status: 202,
      headers: { "cache-control": "no-store", "retry-after": "2", "x-cache": "MISS" }
    }
  );

const findSnapshot = (
  generation: string,
  current: CatalogSnapshot,
  previous?: CatalogSnapshot
): CatalogSnapshot | null => {
  if (current.generation === generation) {
    return current;
  }
  return previous?.generation === generation ? previous : null;
};

const parsePage = (value: string): number | null => {
  if (!/^(0|[1-9]\d*)$/.test(value)) {
    return null;
  }
  const page = Number(value);
  return Number.isSafeInteger(page) ? page : null;
};

const defaultStatus: CatalogSyncStatus = {
  status: "never",
  lastAttemptAt: null,
  lastSuccessAt: null,
  error: null
};

const ALLOW_ALL_ORIGIN = "*";

const parseAllowedOrigins = (raw: string | undefined): string[] => {
  if (!raw || raw.trim() === "") {
    return [ALLOW_ALL_ORIGIN];
  }
  return raw
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
};

// Resolves the value for `Access-Control-Allow-Origin`.
// - "*" in the allowlist means every origin is permitted.
// - Otherwise we echo the requesting origin only when it is explicitly listed;
//   an unlisted origin gets no CORS header and the browser will block it.
const resolveAllowOrigin = (allowed: string[], requestOrigin: string | null): string | null => {
  if (allowed.includes(ALLOW_ALL_ORIGIN)) {
    return ALLOW_ALL_ORIGIN;
  }
  if (requestOrigin && allowed.includes(requestOrigin)) {
    return requestOrigin;
  }
  return null;
};

// Adds CORS headers to every response and answers preflight requests.
// Allowed origins are read from the CORS_ALLOWED_ORIGINS binding (env var).
//
// Setting headers on `context.res` post-next() is required because the
// catalog page route returns its own `new Response(...)` instead of
// `context.json(...)`, which would otherwise discard middleware-set headers.
// We use try/finally so CORS headers are attached even if the route handler
// throws, and we answer OPTIONS preflights directly (a browser sends a
// preflight before a cross-origin GET, but there is no OPTIONS route to match).
const withCors = async (context: Context<CacheManagerEnv>, next: () => Promise<void>) => {
  if (context.req.method === "OPTIONS") {
    context.res = new Response(null, { status: 204 });
  } else {
    try {
      await next();
    } catch {
      // Let Hono's onError produce the response, then attach CORS below.
    }
  }

  const response = context.res;
  if (!response) {
    return;
  }

  const requestOrigin = context.req.header("origin") ?? null;
  const allowOrigin = resolveAllowOrigin(
    parseAllowedOrigins(context.env?.CORS_ALLOWED_ORIGINS),
    requestOrigin
  );

  if (allowOrigin) {
    response.headers.set("Access-Control-Allow-Origin", allowOrigin);
    response.headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
    response.headers.set("Access-Control-Allow-Headers", "Content-Type");
    response.headers.set("Access-Control-Max-Age", "86400");
    if (allowOrigin !== ALLOW_ALL_ORIGIN) {
      // Echoing a specific origin: tell shared caches to vary by Origin.
      response.headers.set("Vary", "Origin");
    }
  }
};

export const createApp = (dependencies: AppDependencies = {}) => {
  const app = new Hono<CacheManagerEnv>();
  app.use("*", withCors);
  const now = dependencies.now ?? (() => new Date());
  const fetchImpl = dependencies.fetchImpl ?? workerFetch;
  const tokenProvider =
    dependencies.tokenProvider ?? createSkillsShTokenProvider({ fetchImpl, now });
  const syncCatalogImpl: CatalogSync =
    dependencies.syncCatalogImpl ??
    ((bindings) => syncCatalog(bindings, { fetchImpl, now, tokenProvider }));
  let catalogRefresh: Promise<CatalogManifest> | null = null;

  const waitUntil = (context: Context<CacheManagerEnv>, promise: Promise<unknown>): void => {
    if (dependencies.waitUntil) {
      dependencies.waitUntil(promise);
      return;
    }
    context.executionCtx.waitUntil(promise);
  };

  const getOrStartCatalogRefresh = (context: Context<CacheManagerEnv>) => {
    if (catalogRefresh) {
      return catalogRefresh;
    }

    catalogRefresh = syncCatalogImpl(context.env).finally(() => {
      catalogRefresh = null;
    });
    return catalogRefresh;
  };

  const refreshCatalogInBackground = (context: Context<CacheManagerEnv>): void => {
    waitUntil(
      context,
      getOrStartCatalogRefresh(context).then(
        () => undefined,
        () => undefined
      )
    );
  };

  const handleDetail = createDetailHandler({
    cache: dependencies.detailCache ?? getDefaultResponseCache(),
    fetchImpl,
    now,
    tokenProvider,
    waitUntil
  });

  const handleSearch = createSearchHandler({
    cache: dependencies.searchCache ?? getDefaultResponseCache(),
    fetchImpl,
    now,
    tokenProvider
  });

  app.get("/health", (context) =>
    context.json({ status: "ok", service: "skills-manager-cache-manager" })
  );

  app.get("/v1/catalog", async (context) => {
    const manifest = parseCatalogManifest(
      await context.env.SKILLS_SH_CACHE.get(catalogManifestKey)
    );
    if (!manifest) {
      refreshCatalogInBackground(context);
      return catalogWarming();
    }

    const currentIsFresh = isCatalogFresh(manifest.current, now());
    if (!currentIsFresh) {
      refreshCatalogInBackground(context);
    }
    context.header("Cache-Control", currentIsFresh ? "public, max-age=60" : "public, max-age=0");
    context.header("X-Cache", currentIsFresh ? "HIT" : "STALE");
    return context.json(manifest);
  });

  // Registered before the `:generation` route so the literal `search` segment can
  // never be captured as a generation id. It also intentionally lives outside
  // `/v1/skills/*`, which the detail wildcard route would otherwise swallow.
  app.get("/v1/catalog/search", (context) => handleSearch(context));

  app.get("/v1/catalog/:generation/pages/:page", async (context) => {
    const manifest = parseCatalogManifest(
      await context.env.SKILLS_SH_CACHE.get(catalogManifestKey)
    );
    if (!manifest) {
      refreshCatalogInBackground(context);
      return catalogWarming();
    }

    const currentIsFresh = isCatalogFresh(manifest.current, now());
    if (!currentIsFresh) {
      refreshCatalogInBackground(context);
    }

    const generation = context.req.param("generation");
    const page = parsePage(context.req.param("page"));
    const snapshot = findSnapshot(generation, manifest.current, manifest.previous);
    if (!snapshot || page === null || page >= snapshot.pageCount) {
      return context.json(
        { error: "catalog_page_not_found", message: "The requested catalog page is not declared." },
        404
      );
    }

    const body = await context.env.SKILLS_SH_CACHE.get(catalogPageKey(generation, page));
    if (body === null) {
      return context.json(
        {
          error: "catalog_page_unavailable",
          message:
            "The catalog page has not reached this location yet. Retry or use the previous generation."
        },
        503
      );
    }

    const pageIsFresh = snapshot.generation === manifest.current.generation && currentIsFresh;

    return new Response(body, {
      headers: {
        "Cache-Control": "public, max-age=31536000, immutable",
        "Content-Type": "application/json; charset=UTF-8",
        "X-Cache": pageIsFresh ? "HIT" : "STALE",
        "X-Catalog-Generation": generation
      }
    });
  });

  app.get("/v1/skills/*", async (context) => {
    const reference = parseSkillReferencePath(context.req.path, "/v1/skills/");
    if (!reference) {
      return context.json(
        { error: "invalid_skill", message: "The requested skill identifier is invalid." },
        400
      );
    }
    return handleDetail(context, reference);
  });

  app.get("/v1/status", async (context) => {
    const status =
      parseCatalogSyncStatus(await context.env.SKILLS_SH_CACHE.get(catalogStatusKey)) ??
      defaultStatus;
    context.header("Cache-Control", "no-store");
    return context.json(status);
  });

  app.post("/internal/sync", async (context) => {
    if (
      !matchesBearerToken(context.req.header("authorization"), context.env.CACHE_ADMIN_TOKEN ?? "")
    ) {
      return context.json(
        { error: "unauthorized", message: "A valid admin token is required." },
        401
      );
    }

    try {
      const manifest = await getOrStartCatalogRefresh(context);
      return context.json(manifest);
    } catch {
      return context.json(
        { error: "catalog_sync_failed", message: "The catalog synchronization failed." },
        502
      );
    }
  });

  app.notFound((context) =>
    context.json({ error: "not_found", message: "The requested route does not exist." }, 404)
  );

  return app;
};
