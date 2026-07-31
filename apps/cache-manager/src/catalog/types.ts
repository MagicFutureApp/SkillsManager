export const catalogView = "all-time" as const;
export const catalogPageSize = 500;

export type CatalogSnapshot = {
  generation: string;
  generatedAt: string;
  pageCount: number;
  perPage: typeof catalogPageSize;
  total: number;
  view: typeof catalogView;
};

export type CatalogManifest = {
  schemaVersion: 1;
  current: CatalogSnapshot;
  previous?: CatalogSnapshot;
};

export type CatalogSyncStatus = {
  status: "never" | "syncing" | "success" | "error";
  lastAttemptAt: string | null;
  lastSuccessAt: string | null;
  error: string | null;
  generation?: string;
  pageCount?: number;
  total?: number;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isNonNegativeInteger = (value: unknown): value is number =>
  Number.isInteger(value) && Number(value) >= 0;

const isSnapshot = (value: unknown): value is CatalogSnapshot =>
  isRecord(value) &&
  typeof value.generation === "string" &&
  value.generation.length > 0 &&
  typeof value.generatedAt === "string" &&
  isNonNegativeInteger(value.pageCount) &&
  Number(value.pageCount) > 0 &&
  value.perPage === catalogPageSize &&
  isNonNegativeInteger(value.total) &&
  value.view === catalogView;

export const parseCatalogManifest = (value: string | null): CatalogManifest | null => {
  if (value === null) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(value);
    if (
      !isRecord(parsed) ||
      parsed.schemaVersion !== 1 ||
      !isSnapshot(parsed.current) ||
      (parsed.previous !== undefined && !isSnapshot(parsed.previous))
    ) {
      return null;
    }

    return parsed as CatalogManifest;
  } catch {
    return null;
  }
};

export const parseCatalogSyncStatus = (value: string | null): CatalogSyncStatus | null => {
  if (value === null) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(value);
    if (
      !isRecord(parsed) ||
      !["never", "syncing", "success", "error"].includes(String(parsed.status)) ||
      !(typeof parsed.lastAttemptAt === "string" || parsed.lastAttemptAt === null) ||
      !(typeof parsed.lastSuccessAt === "string" || parsed.lastSuccessAt === null) ||
      !(typeof parsed.error === "string" || parsed.error === null)
    ) {
      return null;
    }

    return parsed as CatalogSyncStatus;
  } catch {
    return null;
  }
};
