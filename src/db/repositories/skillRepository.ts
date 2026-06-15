import { asc, eq } from "drizzle-orm";

import type { SkillApiRecord, SkillApiStatus } from "../../core/skills/skill-api";
import type { createDbClient } from "../client";
import { repositories, skillUnits, skillVersions } from "../schema";

type DbClient = ReturnType<typeof createDbClient>;

type SkillMetadataSnapshot = {
  description?: unknown;
  skillKey?: unknown;
  tags?: unknown;
};

export const createSkillRepository = (db: DbClient) => {
  return {
    async list(): Promise<SkillApiRecord[]> {
      const rows = await db
        .select({
          commitSha: skillVersions.commitSha,
          entryPath: skillUnits.entryPath,
          id: skillUnits.id,
          metadataSnapshotJson: skillVersions.metadataSnapshotJson,
          name: skillUnits.name,
          repositoryId: skillUnits.repositoryId,
          repositoryName: repositories.name,
          rootPath: skillUnits.rootPath,
          status: skillUnits.status
        })
        .from(skillUnits)
        .innerJoin(repositories, eq(repositories.id, skillUnits.repositoryId))
        .innerJoin(skillVersions, eq(skillVersions.skillUnitId, skillUnits.id))
        .orderBy(asc(repositories.name), asc(skillUnits.name), asc(skillVersions.createdAt));

      const latestRows = new Map<string, (typeof rows)[number]>();

      rows.forEach((row) => {
        latestRows.set(row.id, row);
      });

      return Array.from(latestRows.values()).map((row) => {
        const metadata = parseMetadataSnapshot(row.metadataSnapshotJson);

        return {
          description: metadata.description,
          enabled: row.status !== "removed",
          entry: row.entryPath,
          id: row.id,
          name: row.name,
          repository: row.repositoryName,
          repositoryId: row.repositoryId,
          skillId: metadata.skillKey || toFallbackSkillKey(row.rootPath),
          status: normalizeStatus(row.status),
          tags: metadata.tags,
          targets: [],
          version: row.commitSha.slice(0, 7)
        };
      });
    }
  };
};

const parseMetadataSnapshot = (
  metadataSnapshotJson: string
): { description: string; skillKey: string; tags: string[] } => {
  try {
    const parsed = JSON.parse(metadataSnapshotJson) as SkillMetadataSnapshot;

    return {
      description: typeof parsed.description === "string" ? parsed.description : "",
      skillKey: typeof parsed.skillKey === "string" ? parsed.skillKey : "",
      tags: Array.isArray(parsed.tags)
        ? parsed.tags.filter((tag): tag is string => typeof tag === "string")
        : []
    };
  } catch {
    return { description: "", skillKey: "", tags: [] };
  }
};

const normalizeStatus = (value: string): SkillApiStatus => {
  if (value === "installed" || value === "review") {
    return value;
  }

  return "ready";
};

const toFallbackSkillKey = (rootPath: string): string => {
  return rootPath
    .replace(/^\.+\//, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
};
