import type { RepositoryScanSummary } from "./repository-api";

export const EMPTY_REPOSITORY_SCAN_SUMMARY: RepositoryScanSummary = {
  added: 0,
  changed: 0,
  removed: 0,
  warnings: 0
};

export const slugifyRepositoryName = (value: string): string => {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
};

export const buildRepositoryCachePath = (name: string): string => {
  return `~/.skills-manager/cache/${slugifyRepositoryName(name) || "repository"}`;
};

export const normalizeDiscoveryEntries = (entry: string): string[] => {
  return entry
    .split(/[,\r\n]+/)
    .map((pattern) => pattern.trim())
    .filter(Boolean);
};

export const normalizeRepositoryScanSummary = (
  scan: unknown,
  fallback: RepositoryScanSummary = EMPTY_REPOSITORY_SCAN_SUMMARY
): RepositoryScanSummary => {
  if (!scan || typeof scan !== "object") {
    return fallback;
  }

  const partial = scan as Partial<RepositoryScanSummary>;

  return {
    added: typeof partial.added === "number" ? partial.added : 0,
    changed: typeof partial.changed === "number" ? partial.changed : 0,
    removed: typeof partial.removed === "number" ? partial.removed : 0,
    warnings: typeof partial.warnings === "number" ? partial.warnings : 0
  };
};

export const formatRepositoryDateTime = (
  isoDate: string | null | undefined,
  timeZone = "Asia/Shanghai"
): string => {
  if (!isoDate) {
    return "--";
  }

  const date = new Date(isoDate);

  if (Number.isNaN(date.getTime())) {
    return "--";
  }

  const parts = new Intl.DateTimeFormat("zh-CN", {
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
    minute: "2-digit",
    month: "2-digit",
    timeZone,
    year: "numeric"
  }).formatToParts(date);
  const valueByType = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return `${valueByType.year}/${valueByType.month}/${valueByType.day} ${valueByType.hour}:${valueByType.minute}`;
};
