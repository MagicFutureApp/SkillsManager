import { catalogPageSize, catalogView } from "../catalog/types";
import { fetchSkillsSh } from "../security/skills-sh-fetch";
import type { SkillsShTokenProvider } from "../security/skills-sh-token";
import type { WorkerBindings } from "../worker-env";

const maxCatalogPages = 1_000;

export type CachedCatalogPage = {
  body: string;
  hasMore: boolean;
  page: number;
  perPage: typeof catalogPageSize;
  total: number;
};

type UpstreamCatalogPage = {
  data: Array<Record<string, unknown>>;
  pagination: {
    page: number;
    perPage: number;
    total: number;
    hasMore: boolean;
  };
};

export class SkillsShCatalogError extends Error {
  constructor(
    readonly status: number,
    readonly retryAfter: string | null
  ) {
    super(
      `skills.sh returned ${status}${retryAfter ? ` (retry after ${retryAfter} seconds)` : ""}`
    );
    this.name = "SkillsShCatalogError";
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const parseCatalogPage = (body: string, expectedPage: number): UpstreamCatalogPage | null => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    return null;
  }
  if (!isRecord(parsed) || !Array.isArray(parsed.data) || !isRecord(parsed.pagination)) {
    return null;
  }

  const pagination = parsed.pagination;
  if (
    pagination.page !== expectedPage ||
    pagination.perPage !== catalogPageSize ||
    !Number.isInteger(pagination.total) ||
    Number(pagination.total) < 0 ||
    typeof pagination.hasMore !== "boolean" ||
    !parsed.data.every((skill) => isRecord(skill) && typeof skill.id === "string")
  ) {
    return null;
  }
  return parsed as UpstreamCatalogPage;
};

export const fetchCatalogPage = async (
  bindings: WorkerBindings,
  page: number,
  tokenProvider: SkillsShTokenProvider,
  fetchImpl: typeof fetch
): Promise<CachedCatalogPage> => {
  if (!Number.isInteger(page) || page < 0 || page >= maxCatalogPages) {
    throw new Error("Catalog page is outside the supported range");
  }

  const upstreamUrl =
    `https://skills.sh/api/v1/skills?view=${catalogView}` +
    `&page=${page}&per_page=${catalogPageSize}`;
  const response = await fetchSkillsSh(upstreamUrl, bindings, tokenProvider, fetchImpl);
  if (!response.ok) {
    throw new SkillsShCatalogError(response.status, response.headers.get("retry-after"));
  }

  const body = await response.text();
  const catalogPage = parseCatalogPage(body, page);
  if (!catalogPage) {
    throw new Error("skills.sh returned an invalid catalog page");
  }

  return {
    body,
    hasMore: catalogPage.pagination.hasMore,
    page,
    perPage: catalogPageSize,
    total: catalogPage.pagination.total
  };
};
