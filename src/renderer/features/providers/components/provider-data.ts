import type {
  ProviderApiRecord,
  ProviderConfig,
  ProviderConnectionStatus,
  ProviderType
} from "../../../../core/providers/provider-api";

export type ProviderFilter = ProviderType | "all";
export type ProviderSort = "priority" | "name" | "status" | "provider";
export type ProviderStatusFilter = ProviderConnectionStatus | "all";

export type ProviderViewModel = {
  authMode: string;
  connected: boolean;
  diagnostic: string;
  discoveryPatterns: string[];
  discoveryStrategy: string;
  enabled: boolean;
  id: string;
  name: string;
  notes: string;
  priority: number;
  status: ProviderConnectionStatus;
  type: ProviderType;
};

const defaultProviderConfig: ProviderConfig = {
  authMode: "系统 Git 凭据",
  connected: false,
  diagnostic: "connection: not tested",
  discoveryPatterns: ["skills/*/SKILL.md"],
  discoveryStrategy: "manifest first",
  enabled: false,
  notes: "Provider 配置来自后端 providers 实体。",
  priority: 99,
  status: "review"
};

export const providerLabels: Record<ProviderType, string> = {
  bitbucket: "Bitbucket",
  gitea: "Gitea",
  github: "GitHub",
  gitlab: "GitLab",
  local_git: "Local Git",
  skills_sh: "skills.sh"
};

export const providerFilterOptions: Array<{ label: string; value: ProviderFilter }> = [
  { label: "全部", value: "all" },
  { label: "GitHub", value: "github" },
  { label: "GitLab", value: "gitlab" },
  { label: "Gitea", value: "gitea" },
  { label: "Bitbucket", value: "bitbucket" },
  { label: "Local Git", value: "local_git" },
  { label: "skills.sh", value: "skills_sh" }
];

export const providerStatusOptions: Array<{ label: string; value: ProviderStatusFilter }> = [
  { label: "全部", value: "all" },
  { label: "connected", value: "connected" },
  { label: "review", value: "review" },
  { label: "error", value: "error" }
];

export const adaptProviderRecord = (record: ProviderApiRecord): ProviderViewModel => {
  const parsedConfig = parseProviderConfig(record.configJson);

  return {
    ...parsedConfig,
    id: record.id,
    name: record.name,
    type: record.type
  };
};

export const adaptProviderRecords = (records: ProviderApiRecord[]): ProviderViewModel[] => {
  return records.map(adaptProviderRecord);
};

export const createDefaultProviders = (): ProviderViewModel[] => {
  return [];
};

export const filterProviders = ({
  provider,
  providers,
  sort,
  status
}: {
  provider: ProviderFilter;
  providers: ProviderViewModel[];
  sort: ProviderSort;
  status: ProviderStatusFilter;
}): ProviderViewModel[] => {
  const visibleProviders = providers.filter((item) => {
    return (
      (provider === "all" || item.type === provider) && (status === "all" || item.status === status)
    );
  });

  return [...visibleProviders].sort((first, second) => {
    if (sort === "name") {
      return first.name.localeCompare(second.name);
    }

    if (sort === "status") {
      return first.status.localeCompare(second.status) || first.name.localeCompare(second.name);
    }

    if (sort === "provider") {
      return first.type.localeCompare(second.type) || first.name.localeCompare(second.name);
    }

    return first.priority - second.priority;
  });
};

const isProviderStatus = (value: unknown): value is ProviderConnectionStatus => {
  return value === "connected" || value === "review" || value === "error";
};

const parseProviderConfig = (configJson: string): ProviderConfig => {
  try {
    const parsed = JSON.parse(configJson) as Partial<ProviderConfig>;

    return {
      authMode:
        typeof parsed.authMode === "string" ? parsed.authMode : defaultProviderConfig.authMode,
      connected:
        typeof parsed.connected === "boolean" ? parsed.connected : defaultProviderConfig.connected,
      diagnostic:
        typeof parsed.diagnostic === "string"
          ? parsed.diagnostic
          : defaultProviderConfig.diagnostic,
      discoveryPatterns: Array.isArray(parsed.discoveryPatterns)
        ? parsed.discoveryPatterns.filter((item): item is string => typeof item === "string")
        : defaultProviderConfig.discoveryPatterns,
      discoveryStrategy:
        typeof parsed.discoveryStrategy === "string"
          ? parsed.discoveryStrategy
          : defaultProviderConfig.discoveryStrategy,
      enabled: typeof parsed.enabled === "boolean" ? parsed.enabled : defaultProviderConfig.enabled,
      notes: typeof parsed.notes === "string" ? parsed.notes : defaultProviderConfig.notes,
      priority:
        typeof parsed.priority === "number" ? parsed.priority : defaultProviderConfig.priority,
      status: isProviderStatus(parsed.status) ? parsed.status : defaultProviderConfig.status
    };
  } catch {
    return defaultProviderConfig;
  }
};
