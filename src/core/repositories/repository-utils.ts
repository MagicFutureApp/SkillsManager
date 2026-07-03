import type {
  RepositoryScanSummary,
  RepositorySyncAddedSkill,
  RepositorySyncChangedSkill,
  RepositorySyncDistributionSummary,
  RepositorySyncRemovedSkill,
  RepositorySyncSummary
} from "./repository-api";

export const EMPTY_REPOSITORY_SCAN_SUMMARY: RepositoryScanSummary = {
  added: 0,
  changed: 0,
  removed: 0,
  warnings: 0
};

export const EMPTY_REPOSITORY_SYNC_DISTRIBUTION_SUMMARY: RepositorySyncDistributionSummary = {
  autoDistributionEnabled: false,
  blocked: 0,
  conflicts: 0,
  eligible: 0,
  failed: 0,
  installed: 0,
  skipped: 0,
  updated: 0
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

export const parseRepositoryScanSummaryJson = (summaryJson: string): RepositoryScanSummary => {
  try {
    const parsed = JSON.parse(summaryJson) as unknown;

    return normalizeRepositoryScanSummary(extractRepositoryScanSummary(parsed));
  } catch {
    return EMPTY_REPOSITORY_SCAN_SUMMARY;
  }
};

export const parseRepositorySyncSummaryJson = (summaryJson: string): RepositorySyncSummary => {
  try {
    const parsed = JSON.parse(summaryJson) as unknown;
    const record = isRecord(parsed) ? parsed : {};
    const scanRecord = isRecord(record.scan) ? record.scan : {};

    return {
      distribution: normalizeRepositoryDistributionSummary(record.distribution),
      scan: {
        added: readAddedSkills(scanRecord.added),
        changed: readChangedSkills(scanRecord.changed),
        counts: normalizeRepositoryScanSummary(extractRepositoryScanSummary(parsed)),
        removed: readRemovedSkills(scanRecord.removed),
        warnings: Array.isArray(scanRecord.warnings)
          ? scanRecord.warnings.filter((warning): warning is string => typeof warning === "string")
          : []
      }
    };
  } catch {
    return {
      distribution: EMPTY_REPOSITORY_SYNC_DISTRIBUTION_SUMMARY,
      scan: {
        added: [],
        changed: [],
        counts: EMPTY_REPOSITORY_SCAN_SUMMARY,
        removed: [],
        warnings: []
      }
    };
  }
};

const extractRepositoryScanSummary = (value: unknown): unknown => {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as { scan?: unknown };
  const scan = record.scan;

  if (scan && typeof scan === "object" && "counts" in scan) {
    return (scan as { counts?: unknown }).counts;
  }

  return scan ?? value;
};

const normalizeRepositoryDistributionSummary = (
  value: unknown
): RepositorySyncDistributionSummary => {
  if (!isRecord(value)) {
    return EMPTY_REPOSITORY_SYNC_DISTRIBUTION_SUMMARY;
  }

  return {
    autoDistributionEnabled:
      typeof value.autoDistributionEnabled === "boolean" ? value.autoDistributionEnabled : false,
    blocked: readNumber(value.blocked),
    conflicts: readNumber(value.conflicts),
    eligible: readNumber(value.eligible),
    failed: readNumber(value.failed),
    installed: readNumber(value.installed),
    skipped: readNumber(value.skipped),
    updated: readNumber(value.updated)
  };
};

const readAddedSkills = (value: unknown): RepositorySyncAddedSkill[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(isAddedSkill);
};

const readChangedSkills = (value: unknown): RepositorySyncChangedSkill[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(isChangedSkill);
};

const readRemovedSkills = (value: unknown): RepositorySyncRemovedSkill[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(isRemovedSkill);
};

const isAddedSkill = (value: unknown): value is RepositorySyncAddedSkill => {
  return (
    isRecord(value) &&
    typeof value.commitSha === "string" &&
    typeof value.name === "string" &&
    typeof value.skillKey === "string" &&
    typeof value.skillUnitId === "string"
  );
};

const isChangedSkill = (value: unknown): value is RepositorySyncChangedSkill => {
  return (
    isRecord(value) &&
    typeof value.commitSha === "string" &&
    typeof value.name === "string" &&
    (value.previousCommitSha === null || typeof value.previousCommitSha === "string") &&
    typeof value.skillKey === "string" &&
    typeof value.skillUnitId === "string"
  );
};

const isRemovedSkill = (value: unknown): value is RepositorySyncRemovedSkill => {
  return (
    isRecord(value) &&
    typeof value.name === "string" &&
    (value.previousCommitSha === null || typeof value.previousCommitSha === "string") &&
    typeof value.skillKey === "string" &&
    typeof value.skillUnitId === "string"
  );
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return Boolean(value) && typeof value === "object";
};

const readNumber = (value: unknown): number => {
  return typeof value === "number" ? value : 0;
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
