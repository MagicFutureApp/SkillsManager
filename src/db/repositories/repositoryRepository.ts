import { asc } from "drizzle-orm";

import type {
  CreateRepositoryInput,
  RepositoryApiRecord,
  RepositoryConfig,
  RepositoryProviderName
} from "../../core/repositories/repository-api";
import type { ProviderType } from "../../core/providers/provider-api";
import type { createDbClient } from "../client";
import { providers, repositories, skillUnits } from "../schema";

type DbClient = ReturnType<typeof createDbClient>;

export const createRepositoryRepository = (db: DbClient) => {
  return {
    async create(input: CreateRepositoryInput): Promise<RepositoryApiRecord> {
      const now = new Date();
      const id = buildRepositoryId(input.name, now);
      const providerId = providerIdByName[input.provider];
      const config = buildCreatedRepositoryConfig(input);

      await ensureProvider({
        db,
        now,
        providerId,
        providerName: input.provider
      });

      await db.insert(repositories).values({
        configJson: JSON.stringify(config),
        createdAt: now,
        defaultBranch: input.branch || "main",
        id,
        lastScannedCommitSha: null,
        localCachePath: buildCachePath(input.name),
        name: input.name,
        providerId,
        remoteUrl: input.remoteUrl,
        updatedAt: now
      });

      return {
        branch: input.branch || "main",
        configJson: JSON.stringify(config),
        id,
        lastScannedCommitSha: null,
        localCachePath: buildCachePath(input.name),
        name: input.name,
        providerId,
        remoteUrl: input.remoteUrl,
        updatedAt: now.toISOString()
      };
    },

    async list(): Promise<RepositoryApiRecord[]> {
      const repositoryRows = await db.select().from(repositories).orderBy(asc(repositories.id));
      const providerRows = await db.select().from(providers);
      const skillUnitRows = await db.select().from(skillUnits);
      const providersById = new Map(providerRows.map((provider) => [provider.id, provider]));
      const skillUnitCounts = countSkillUnitsByRepository(skillUnitRows);

      return repositoryRows.map((repository, index) => {
        const provider = providersById.get(repository.providerId);
        const providerName = providerNameFor(provider?.type, repository.remoteUrl);
        const skillUnitCount = skillUnitCounts.get(repository.id) ?? 0;
        const config = mergeRepositoryConfig({
          configJson: repository.configJson,
          index,
          providerName,
          repositoryId: repository.id,
          skillUnitCount,
          wasScanned: Boolean(repository.lastScannedCommitSha)
        });

        return {
          branch: repository.defaultBranch ?? "main",
          configJson: JSON.stringify(config),
          id: repository.id,
          lastScannedCommitSha: repository.lastScannedCommitSha,
          localCachePath: repository.localCachePath,
          name: repository.name || deriveRepositoryName(repository.remoteUrl, repository.id),
          providerId: repository.providerId,
          remoteUrl: repository.remoteUrl,
          updatedAt: repository.updatedAt.toISOString()
        };
      });
    }
  };
};

const ensureProvider = async ({
  db,
  now,
  providerId,
  providerName
}: {
  db: DbClient;
  now: Date;
  providerId: string;
  providerName: RepositoryProviderName;
}): Promise<void> => {
  const existingProviders = await db.select().from(providers);

  if (existingProviders.some((provider) => provider.id === providerId)) {
    return;
  }

  await db.insert(providers).values({
    configJson: "{}",
    createdAt: now,
    id: providerId,
    name: providerName,
    type: providerTypeByName[providerName],
    updatedAt: now
  });
};

const countSkillUnitsByRepository = (
  rows: Array<typeof skillUnits.$inferSelect>
): Map<string, number> => {
  const counts = new Map<string, number>();

  rows.forEach((row) => {
    counts.set(row.repositoryId, (counts.get(row.repositoryId) ?? 0) + 1);
  });

  return counts;
};

const mergeRepositoryConfig = ({
  configJson,
  index,
  providerName,
  repositoryId,
  skillUnitCount,
  wasScanned
}: {
  configJson: string;
  index: number;
  providerName: RepositoryProviderName;
  repositoryId: string;
  skillUnitCount: number;
  wasScanned: boolean;
}): RepositoryConfig => {
  const savedConfig = parseRepositoryConfig(configJson);

  return {
    enabled: savedConfig.enabled ?? true,
    lastScanLabel: savedConfig.lastScanLabel ?? (wasScanned ? "已扫描" : "未执行"),
    note: savedConfig.note ?? `真实来源记录 ${repositoryId}，等待手动同步扫描。`,
    patterns: savedConfig.patterns ?? ["skills/*/SKILL.md"],
    priority: savedConfig.priority ?? index + 1,
    providerName: savedConfig.providerName ?? providerName,
    scan: { added: 0, changed: 0, removed: 0, warnings: 0 },
    skillUnits: skillUnitCount,
    status: savedConfig.status ?? (wasScanned ? "ready" : "review")
  };
};

const buildCreatedRepositoryConfig = (input: CreateRepositoryInput): RepositoryConfig => {
  return {
    enabled: true,
    lastScanLabel: "未执行",
    note: input.note || "用户新增的来源，等待第一次同步扫描。",
    patterns: input.patterns,
    priority: 99,
    providerName: input.provider,
    scan: { added: 0, changed: 0, removed: 0, warnings: 0 },
    skillUnits: 0,
    status: "review"
  };
};

const providerNameFor = (
  providerType: string | undefined,
  remoteUrl: string
): RepositoryProviderName => {
  const normalizedProviderType = normalizeProviderType(providerType);

  if (normalizedProviderType) {
    return providerNamesByType[normalizedProviderType];
  }

  if (isLocalPath(remoteUrl)) {
    return "Local Git";
  }

  return "GitHub";
};

const providerNamesByType: Record<ProviderType, RepositoryProviderName> = {
  bitbucket: "Bitbucket",
  gitea: "Gitea",
  github: "GitHub",
  gitlab: "GitLab",
  local_git: "Local Git",
  skills_sh: "skills.sh"
};

const providerIdByName: Record<RepositoryProviderName, string> = {
  Bitbucket: "bitbucket",
  Gitea: "gitea",
  GitHub: "github",
  GitLab: "gitlab",
  "Local Git": "local-git",
  "skills.sh": "skills-sh"
};

const providerTypeByName: Record<RepositoryProviderName, ProviderType> = {
  Bitbucket: "bitbucket",
  Gitea: "gitea",
  GitHub: "github",
  GitLab: "gitlab",
  "Local Git": "local_git",
  "skills.sh": "skills_sh"
};

const normalizeProviderType = (value: string | undefined): ProviderType | null => {
  if (
    value === "github" ||
    value === "gitlab" ||
    value === "gitea" ||
    value === "bitbucket" ||
    value === "local_git" ||
    value === "skills_sh"
  ) {
    return value;
  }

  return null;
};

const deriveRepositoryName = (remoteUrl: string, fallbackId: string): string => {
  const trimmedRemote = remoteUrl
    .trim()
    .replace(/[\\/]+$/, "")
    .replace(/\.git$/i, "");
  const lastSegment = trimmedRemote
    .split(/[\\/:]/)
    .filter(Boolean)
    .pop();

  return lastSegment || fallbackId;
};

const buildRepositoryId = (name: string, now: Date): string => {
  return `repo-${slugify(name) || "source"}-${now.getTime()}`;
};

const buildCachePath = (name: string): string => {
  return `~/.skills-manager/cache/${slugify(name) || "repository"}`;
};

const slugify = (value: string): string => {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
};

const parseRepositoryConfig = (configJson: string): Partial<RepositoryConfig> => {
  try {
    const parsed = JSON.parse(configJson) as Partial<RepositoryConfig>;

    return {
      enabled: typeof parsed.enabled === "boolean" ? parsed.enabled : undefined,
      lastScanLabel: typeof parsed.lastScanLabel === "string" ? parsed.lastScanLabel : undefined,
      note: typeof parsed.note === "string" ? parsed.note : undefined,
      patterns: Array.isArray(parsed.patterns)
        ? parsed.patterns.filter((pattern): pattern is string => typeof pattern === "string")
        : undefined,
      priority: typeof parsed.priority === "number" ? parsed.priority : undefined,
      providerName: isProviderName(parsed.providerName) ? parsed.providerName : undefined,
      status: isScanStatus(parsed.status) ? parsed.status : undefined
    };
  } catch {
    return {};
  }
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

const isScanStatus = (value: unknown): value is RepositoryConfig["status"] => {
  return value === "ready" || value === "review" || value === "failed";
};

const isLocalPath = (remoteUrl: string): boolean => {
  return (
    /^[A-Za-z]:[\\/]/.test(remoteUrl) || remoteUrl.startsWith("/") || remoteUrl.startsWith(".")
  );
};
