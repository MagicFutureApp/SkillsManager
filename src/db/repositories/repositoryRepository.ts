import { asc } from "drizzle-orm";

import type {
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
        const config = buildRepositoryConfig({
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
          name: deriveRepositoryName(repository.remoteUrl, repository.id),
          providerId: repository.providerId,
          remoteUrl: repository.remoteUrl,
          updatedAt: repository.updatedAt.toISOString()
        };
      });
    }
  };
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

const buildRepositoryConfig = ({
  index,
  providerName,
  repositoryId,
  skillUnitCount,
  wasScanned
}: {
  index: number;
  providerName: RepositoryProviderName;
  repositoryId: string;
  skillUnitCount: number;
  wasScanned: boolean;
}): RepositoryConfig => {
  return {
    enabled: true,
    lastScanLabel: wasScanned ? "已扫描" : "未执行",
    note: `真实来源记录 ${repositoryId}，等待手动同步扫描。`,
    patterns: ["skills/*/SKILL.md"],
    priority: index + 1,
    providerName,
    scan: { added: 0, changed: 0, removed: 0, warnings: 0 },
    skillUnits: skillUnitCount,
    status: wasScanned ? "ready" : "review"
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

const isLocalPath = (remoteUrl: string): boolean => {
  return (
    /^[A-Za-z]:[\\/]/.test(remoteUrl) || remoteUrl.startsWith("/") || remoteUrl.startsWith(".")
  );
};
