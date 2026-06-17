import type {
  RepositoryApiRecord,
  RepositoryConfig,
  RepositoryLastSync,
  RepositoryProviderName,
  RepositoryScanStatus,
  RepositoryScanSummary
} from "../../../../core/repositories/repository-api";

export type RepositoryProviderFilter = RepositoryProviderName | "all";
export type RepositorySort = "priority" | "name" | "provider" | "status" | "skills";
export type RepositoryStatusFilter = RepositoryScanStatus | "all";

export type RepositoryViewModel = {
  branch: string;
  cachePath: string;
  enabled: boolean;
  id: string;
  lastCommit: string;
  lastScanLabel: string;
  lastSync: RepositoryLastSync | null;
  name: string;
  note: string;
  patterns: string[];
  priority: number;
  provider: RepositoryProviderName;
  providerId: string;
  remoteUrl: string;
  scan: RepositoryScanSummary;
  skillUnits: number;
  status: RepositoryScanStatus;
};

export type RepositoryFormValues = {
  branch: string;
  cachePath: string;
  name: string;
  note: string;
  patterns: string;
  provider: RepositoryProviderName;
  remoteUrl: string;
};

const defaultConfig: RepositoryConfig = {
  enabled: true,
  lastScanLabel: "未执行",
  note: "用户注册的来源，等待手动同步扫描。",
  patterns: ["skills/*/SKILL.md"],
  priority: 99,
  providerName: "GitHub",
  scan: { added: 0, changed: 0, removed: 0, warnings: 0 },
  skillUnits: 0,
  status: "review"
};

export const repositoryProviderOptions: Array<{
  label: RepositoryProviderFilter;
  value: RepositoryProviderFilter;
}> = [
  { label: "all", value: "all" },
  { label: "GitHub", value: "GitHub" },
  { label: "GitLab", value: "GitLab" },
  { label: "Gitea", value: "Gitea" },
  { label: "Bitbucket", value: "Bitbucket" },
  { label: "Local Git", value: "Local Git" },
  { label: "skills.sh", value: "skills.sh" }
];

export const repositoryStatusOptions: Array<{
  label: RepositoryStatusFilter;
  value: RepositoryStatusFilter;
}> = [
  { label: "all", value: "all" },
  { label: "ready", value: "ready" },
  { label: "review", value: "review" },
  { label: "failed", value: "failed" }
];

export const adaptRepositoryRecord = (record: RepositoryApiRecord): RepositoryViewModel => {
  const config = parseRepositoryConfig(record.configJson);

  return {
    branch: record.branch,
    cachePath: record.localCachePath,
    enabled: config.enabled,
    id: record.id,
    lastCommit: record.lastScannedCommitSha ?? "--",
    lastScanLabel: config.lastScanLabel,
    lastSync: record.lastSync,
    name: record.name,
    note: config.note,
    patterns: config.patterns,
    priority: config.priority,
    provider: config.providerName,
    providerId: record.providerId,
    remoteUrl: record.remoteUrl,
    scan: config.scan,
    skillUnits: config.skillUnits,
    status: config.status
  };
};

export const adaptRepositoryRecords = (records: RepositoryApiRecord[]): RepositoryViewModel[] => {
  return records.map(adaptRepositoryRecord);
};

export const createDefaultRepositories = (): RepositoryViewModel[] => {
  return [];
};

export const filterRepositories = ({
  provider,
  query,
  repositories,
  sort,
  status
}: {
  provider: RepositoryProviderFilter;
  query: string;
  repositories: RepositoryViewModel[];
  sort: RepositorySort;
  status: RepositoryStatusFilter;
}): RepositoryViewModel[] => {
  const normalizedQuery = query.trim().toLowerCase();
  const visible = repositories.filter((repository) => {
    const searchable = [
      repository.name,
      repository.provider,
      repository.remoteUrl,
      repository.branch,
      repository.cachePath,
      repository.patterns.join(", "),
      repository.note
    ]
      .join(" ")
      .toLowerCase();

    return (
      (!normalizedQuery || searchable.includes(normalizedQuery)) &&
      (provider === "all" || repository.provider === provider) &&
      (status === "all" || repository.status === status)
    );
  });

  return [...visible].sort((first, second) => {
    if (sort === "name") {
      return first.name.localeCompare(second.name);
    }

    if (sort === "provider") {
      return first.provider.localeCompare(second.provider) || first.name.localeCompare(second.name);
    }

    if (sort === "status") {
      return first.status.localeCompare(second.status) || first.name.localeCompare(second.name);
    }

    if (sort === "skills") {
      return second.skillUnits - first.skillUnits || first.name.localeCompare(second.name);
    }

    return first.priority - second.priority || first.name.localeCompare(second.name);
  });
};

export const buildRepositoryFromForm = ({
  formValues,
  index
}: {
  formValues: RepositoryFormValues;
  index: number;
}): RepositoryViewModel => {
  return {
    branch: formValues.branch || "main",
    cachePath: formValues.cachePath || buildCachePath(formValues.name),
    enabled: true,
    id: `repo-${Date.now()}`,
    lastCommit: "--",
    lastScanLabel: "未执行",
    lastSync: null,
    name: formValues.name,
    note: formValues.note || "用户新增的来源，等待第一次同步扫描。",
    patterns: normalizeFormDiscoveryEntry(formValues.patterns),
    priority: index + 1,
    provider: formValues.provider,
    providerId: providerIdByName[formValues.provider],
    remoteUrl: formValues.remoteUrl,
    scan: { added: 0, changed: 0, removed: 0, warnings: 0 },
    skillUnits: 0,
    status: "review"
  };
};

const providerIdByName: Record<RepositoryProviderName, string> = {
  Bitbucket: "bitbucket",
  Gitea: "gitea",
  GitHub: "github",
  GitLab: "gitlab",
  "Local Git": "local-git",
  "skills.sh": "skills-sh"
};

const buildCachePath = (name: string): string => {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  return `~/.skills-manager/cache/${slug || "repository"}`;
};

const normalizeFormDiscoveryEntry = (entry: string): string[] => {
  const trimmedEntry = entry.trim();

  return trimmedEntry ? [trimmedEntry] : [];
};

const isProviderName = (value: unknown): value is RepositoryProviderName => {
  return (
    value === "Bitbucket" ||
    value === "Gitea" ||
    value === "GitHub" ||
    value === "GitLab" ||
    value === "Local Git" ||
    value === "skills.sh"
  );
};

const isScanStatus = (value: unknown): value is RepositoryScanStatus => {
  return value === "ready" || value === "review" || value === "failed";
};

const parseRepositoryConfig = (configJson: string): RepositoryConfig => {
  try {
    const parsed = JSON.parse(configJson) as Partial<RepositoryConfig>;

    return {
      enabled: typeof parsed.enabled === "boolean" ? parsed.enabled : defaultConfig.enabled,
      lastScanLabel:
        typeof parsed.lastScanLabel === "string"
          ? parsed.lastScanLabel
          : defaultConfig.lastScanLabel,
      note: typeof parsed.note === "string" ? parsed.note : defaultConfig.note,
      patterns: Array.isArray(parsed.patterns)
        ? parsed.patterns.filter((pattern): pattern is string => typeof pattern === "string")
        : defaultConfig.patterns,
      priority: typeof parsed.priority === "number" ? parsed.priority : defaultConfig.priority,
      providerName: isProviderName(parsed.providerName)
        ? parsed.providerName
        : defaultConfig.providerName,
      scan: normalizeScanSummary(parsed.scan),
      skillUnits:
        typeof parsed.skillUnits === "number" ? parsed.skillUnits : defaultConfig.skillUnits,
      status: isScanStatus(parsed.status) ? parsed.status : defaultConfig.status
    };
  } catch {
    return defaultConfig;
  }
};

const normalizeScanSummary = (scan: unknown): RepositoryScanSummary => {
  if (!scan || typeof scan !== "object") {
    return defaultConfig.scan;
  }

  const partial = scan as Partial<RepositoryScanSummary>;

  return {
    added: typeof partial.added === "number" ? partial.added : 0,
    changed: typeof partial.changed === "number" ? partial.changed : 0,
    removed: typeof partial.removed === "number" ? partial.removed : 0,
    warnings: typeof partial.warnings === "number" ? partial.warnings : 0
  };
};
