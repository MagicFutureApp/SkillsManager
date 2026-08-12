import { ipcMain } from "electron";

import { createCatalogClient, type CatalogClient } from "../../core/catalog/catalog-client";
import type {
  CatalogManifestResult,
  CatalogPageInput,
  CatalogPageResult,
  CatalogResult,
  CatalogSearchInput,
  CatalogSearchResult,
  CatalogSearchType
} from "../../core/catalog/catalog-types";

export type {
  CatalogManifestResult,
  CatalogPageInput,
  CatalogPageResult,
  CatalogResult,
  CatalogSearchInput,
  CatalogSearchResult,
  CatalogSearchType
};

const unknownFailure = (error: unknown): CatalogResult<never> => ({
  ok: false,
  error: {
    code: "unknown",
    message: error instanceof Error ? error.message : String(error)
  }
});

/**
 * Renderer input is untrusted: the Worker itself answers 404 for a malformed
 * page index, so we mirror that semantic without spending a network request.
 */
const parsePageInput = (input: unknown): CatalogPageInput | null => {
  if (typeof input !== "object" || input === null) {
    return null;
  }

  const candidate = input as Partial<CatalogPageInput>;

  if (!Number.isInteger(candidate.page) || (candidate.page as number) < 0) {
    return null;
  }

  return {
    page: candidate.page as number,
    forceRefresh: candidate.forceRefresh === true
  };
};

/**
 * Renderer input is untrusted. This boundary only enforces the *shape* of the
 * request (types); the client owns every *semantic* rule — query length limits,
 * owner pattern, and limit clamping — so those live in exactly one place.
 *
 * A malformed payload is rejected as `invalid-query` without a network request,
 * mirroring how the client rejects a too-short query locally.
 */
const parseSearchInput = (input: unknown): CatalogSearchInput | null => {
  if (typeof input !== "object" || input === null) {
    return null;
  }

  const candidate = input as Record<string, unknown>;

  if (typeof candidate.query !== "string") {
    return null;
  }

  const parsedInput: CatalogSearchInput = { query: candidate.query };

  // `undefined`/`null` mean "not provided" and fall back to the client default.
  if (candidate.limit !== undefined && candidate.limit !== null) {
    if (typeof candidate.limit !== "number" || !Number.isFinite(candidate.limit)) {
      return null;
    }

    parsedInput.limit = candidate.limit;
  }

  if (candidate.owner !== undefined && candidate.owner !== null) {
    if (typeof candidate.owner !== "string") {
      return null;
    }

    parsedInput.owner = candidate.owner;
  }

  return parsedInput;
};

export const getCatalogManifest = async (
  client: CatalogClient
): Promise<CatalogResult<CatalogManifestResult>> => {
  try {
    return await client.getManifest();
  } catch (error: unknown) {
    console.error("Failed to resolve the catalog manifest.", error);

    return unknownFailure(error);
  }
};

export const getCatalogPage = async (
  client: CatalogClient,
  input: unknown
): Promise<CatalogResult<CatalogPageResult>> => {
  const parsedInput = parsePageInput(input);

  if (!parsedInput) {
    return {
      ok: false,
      error: { code: "not-found", message: "Invalid catalog page index." }
    };
  }

  try {
    return await client.getPage(parsedInput);
  } catch (error: unknown) {
    console.error(`Failed to load catalog page ${parsedInput.page}.`, error);

    return unknownFailure(error);
  }
};

export const searchCatalog = async (
  client: CatalogClient,
  input: unknown
): Promise<CatalogResult<CatalogSearchResult>> => {
  const parsedInput = parseSearchInput(input);

  if (!parsedInput) {
    return {
      ok: false,
      error: { code: "invalid-query", message: "Invalid catalog search input." }
    };
  }

  try {
    return await client.search(parsedInput);
  } catch (error: unknown) {
    console.error("Failed to run a catalog search.", error);

    return unknownFailure(error);
  }
};

export const registerCatalogIpc = (client: CatalogClient = createCatalogClient()): void => {
  ipcMain.handle("catalog:getManifest", (): Promise<CatalogResult<CatalogManifestResult>> => {
    return getCatalogManifest(client);
  });

  ipcMain.handle(
    "catalog:getPage",
    (_event, input: unknown): Promise<CatalogResult<CatalogPageResult>> => {
      return getCatalogPage(client, input);
    }
  );

  ipcMain.handle(
    "catalog:search",
    (_event, input: unknown): Promise<CatalogResult<CatalogSearchResult>> => {
      return searchCatalog(client, input);
    }
  );
};
