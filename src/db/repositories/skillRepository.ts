import { asc, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";

import type {
  SkillApiRecord,
  SkillApiStatus,
  UpdateSkillTargetPreferenceInput
} from "../../core/skills/skill-api";
import type { createDbClient } from "../client";
import { repositories, skillTargetPreferences, skillUnits, skillVersions } from "../schema";

type DbClient = ReturnType<typeof createDbClient>;

type SkillMetadataSnapshot = {
  skillKey?: unknown;
  tags?: unknown;
};

export const createSkillRepository = (db: DbClient) => {
  return {
    async count(): Promise<number> {
      const rows = await db
        .select({
          id: skillUnits.id,
          repositoryConfigJson: repositories.configJson
        })
        .from(skillUnits)
        .innerJoin(repositories, eq(repositories.id, skillUnits.repositoryId))
        .innerJoin(skillVersions, eq(skillVersions.skillUnitId, skillUnits.id));
      const skillIds = new Set<string>();

      rows.filter(isSkillSourceEnabled).forEach((row) => {
        skillIds.add(row.id);
      });

      return skillIds.size;
    },

    async list(): Promise<SkillApiRecord[]> {
      const rows = await db
        .select({
          commitSha: skillVersions.commitSha,
          description: skillUnits.description,
          entryPath: skillUnits.entryPath,
          id: skillUnits.id,
          metadataSnapshotJson: skillVersions.metadataSnapshotJson,
          name: skillUnits.name,
          repositoryConfigJson: repositories.configJson,
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

      rows.filter(isSkillSourceEnabled).forEach((row) => {
        latestRows.set(row.id, row);
      });
      const targetsBySkillId = await getEnabledTargetsBySkillId(db);

      return Array.from(latestRows.values()).map((row) => {
        const metadata = parseMetadataSnapshot(row.metadataSnapshotJson);

        return {
          description: row.description,
          enabled: row.status !== "removed",
          entry: row.entryPath,
          id: row.id,
          name: row.name,
          repository: row.repositoryName,
          repositoryId: row.repositoryId,
          skillId: metadata.skillKey || toFallbackSkillKey(row.rootPath),
          status: normalizeStatus(row.status),
          tags: metadata.tags,
          targets: targetsBySkillId.get(row.id) ?? [],
          version: row.commitSha.slice(0, 7)
        };
      });
    },

    async setTargetPreference(input: UpdateSkillTargetPreferenceInput): Promise<void> {
      const now = new Date();

      await db
        .insert(skillTargetPreferences)
        .values({
          agentTargetId: input.agentTargetId,
          createdAt: now,
          enabled: input.enabled,
          id: randomUUID(),
          skillUnitId: input.skillUnitId,
          updatedAt: now
        })
        .onConflictDoUpdate({
          target: [skillTargetPreferences.skillUnitId, skillTargetPreferences.agentTargetId],
          set: {
            enabled: input.enabled,
            updatedAt: now
          }
        });
    }
  };
};

const getEnabledTargetsBySkillId = async (db: DbClient): Promise<Map<string, string[]>> => {
  const rows = await db
    .select({
      skillId: skillTargetPreferences.skillUnitId,
      targetId: skillTargetPreferences.agentTargetId
    })
    .from(skillTargetPreferences)
    .where(eq(skillTargetPreferences.enabled, true))
    .orderBy(asc(skillTargetPreferences.agentTargetId));
  const targetsBySkillId = new Map<string, string[]>();

  rows.forEach((row) => {
    const targets = targetsBySkillId.get(row.skillId) ?? [];

    targets.push(row.targetId);
    targetsBySkillId.set(row.skillId, targets);
  });

  return targetsBySkillId;
};

const isSkillSourceEnabled = (row: { repositoryConfigJson: string }): boolean => {
  try {
    const parsed = JSON.parse(row.repositoryConfigJson) as { enabled?: unknown };

    return parsed.enabled !== false;
  } catch {
    return true;
  }
};

const parseMetadataSnapshot = (
  metadataSnapshotJson: string
): { skillKey: string; tags: string[] } => {
  try {
    const parsed = JSON.parse(metadataSnapshotJson) as SkillMetadataSnapshot;

    return {
      skillKey: typeof parsed.skillKey === "string" ? parsed.skillKey : "",
      tags: Array.isArray(parsed.tags)
        ? parsed.tags.filter((tag): tag is string => typeof tag === "string")
        : []
    };
  } catch {
    return { skillKey: "", tags: [] };
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
