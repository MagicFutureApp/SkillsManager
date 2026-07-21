import { asc, count, eq, inArray } from "drizzle-orm";
import { randomUUID } from "node:crypto";

import { isBuiltInTargetType } from "../../core/targets/target-api";
import type {
  RegisteredTargetRecord,
  RegisteredTargetStatus,
  SystemTargetRecord,
  TargetRegistrationScope,
  TargetScanCandidate,
  TargetScanRecord,
  TargetSkillPreference,
  TargetSkillSelection
} from "../../core/targets/target-api";
import type { createDbClient } from "../client";
import {
  agentTargets,
  installInstances,
  repositories,
  skillTargetPreferences,
  skillUnits
} from "../schema";

type DbClient = ReturnType<typeof createDbClient>;

type RegisterCustomDirectoryTargetInput = {
  id: string;
  name: string;
  normalizedPath: string;
  path: string;
};
type UpdateCustomDirectoryTargetInput = {
  id: string;
  name: string;
  normalizedPath: string;
  path: string;
};
type AgentTargetInsert = typeof agentTargets.$inferInsert;
export type TargetInstalledSkillFile = {
  agentTargetId: string;
  installedPath: string;
  targetPath: string;
};

export const createTargetRepository = (db: DbClient) => {
  return {
    async count(): Promise<number> {
      const rows = await db.select({ value: count() }).from(agentTargets);

      return rows[0]?.value ?? 0;
    },

    async list(): Promise<RegisteredTargetRecord[]> {
      const targetRows = await db.select().from(agentTargets).orderBy(asc(agentTargets.name));
      const preferenceRows = await db
        .select({
          enabled: skillTargetPreferences.enabled,
          repositoryName: repositories.name,
          skillId: skillUnits.id,
          skillName: skillUnits.name,
          targetId: skillTargetPreferences.agentTargetId
        })
        .from(skillTargetPreferences)
        .innerJoin(skillUnits, eq(skillUnits.id, skillTargetPreferences.skillUnitId))
        .innerJoin(repositories, eq(repositories.id, skillUnits.repositoryId))
        .orderBy(asc(skillUnits.name));
      const selectionsByTargetId = new Map<string, TargetSkillSelection[]>();
      const preferencesByTargetId = new Map<string, TargetSkillPreference[]>();

      preferenceRows.forEach((row) => {
        const preference = {
          enabled: row.enabled,
          id: row.skillId,
          name: row.skillName,
          repository: row.repositoryName
        };
        const preferences = preferencesByTargetId.get(row.targetId) ?? [];

        preferences.push(preference);
        preferencesByTargetId.set(row.targetId, preferences);

        if (row.enabled) {
          const selections = selectionsByTargetId.get(row.targetId) ?? [];

          selections.push({
            id: row.skillId,
            name: row.skillName,
            repository: row.repositoryName
          });
          selectionsByTargetId.set(row.targetId, selections);
        }
      });

      return targetRows.map((target) => {
        const selectedSkills = selectionsByTargetId.get(target.id) ?? [];
        const skillPreferences = preferencesByTargetId.get(target.id) ?? [];

        return {
          createdAt: target.createdAt.toISOString(),
          enabled: target.enabled,
          id: target.id,
          name: target.name,
          normalizedPath: target.normalizedPath,
          path: target.path,
          scanMessage: target.scanMessage,
          selectedSkills,
          skillPreferences,
          skillCount: selectedSkills.length,
          scope: normalizeScope(target.scope),
          status: normalizeStatus({
            detectionStatus: target.detectionStatus,
            enabled: target.enabled
          }),
          type: target.type,
          updatedAt: target.updatedAt.toISOString()
        };
      });
    },

    async listScanCandidates(): Promise<TargetScanCandidate[]> {
      const targetRows = await db.select().from(agentTargets).orderBy(asc(agentTargets.name));

      return targetRows.map((target) => ({
        id: target.id,
        name: target.name,
        normalizedPath: target.normalizedPath,
        path: target.path,
        type: target.type
      }));
    },

    async listInstalledSkillFilesForTargets(
      targetIds: string[]
    ): Promise<TargetInstalledSkillFile[]> {
      const normalizedTargetIds = normalizeTargetIds(targetIds);

      if (!normalizedTargetIds.length) {
        return [];
      }

      const targetRows = await db
        .select({
          id: agentTargets.id,
          path: agentTargets.path,
          type: agentTargets.type
        })
        .from(agentTargets)
        .where(inArray(agentTargets.id, normalizedTargetIds));

      if (targetRows.some((target) => isBuiltInTargetType(target.type))) {
        throw new Error("System built-in targets cannot be deleted.");
      }

      const deletableTargetIds = targetRows.map((target) => target.id);

      if (!deletableTargetIds.length) {
        return [];
      }

      return db
        .select({
          agentTargetId: installInstances.agentTargetId,
          installedPath: installInstances.installedPath,
          targetPath: agentTargets.path
        })
        .from(installInstances)
        .innerJoin(agentTargets, eq(agentTargets.id, installInstances.agentTargetId))
        .where(inArray(installInstances.agentTargetId, deletableTargetIds));
    },

    async deleteTargets(
      targetIds: string[],
      options: { deleteInstallInstances?: boolean } = {}
    ): Promise<void> {
      const normalizedTargetIds = normalizeTargetIds(targetIds);

      if (!normalizedTargetIds.length) {
        return;
      }

      const targetRows = await db
        .select({
          id: agentTargets.id,
          type: agentTargets.type
        })
        .from(agentTargets)
        .where(inArray(agentTargets.id, normalizedTargetIds));

      if (targetRows.some((target) => isBuiltInTargetType(target.type))) {
        throw new Error("System built-in targets cannot be deleted.");
      }

      const deletableTargetIds = targetRows.map((target) => target.id);

      if (!deletableTargetIds.length) {
        return;
      }

      db.transaction((tx) => {
        if (options.deleteInstallInstances) {
          tx.delete(installInstances)
            .where(inArray(installInstances.agentTargetId, deletableTargetIds))
            .run();
        }
        tx.delete(skillTargetPreferences)
          .where(inArray(skillTargetPreferences.agentTargetId, deletableTargetIds))
          .run();
        tx.delete(agentTargets).where(inArray(agentTargets.id, deletableTargetIds)).run();
      });
    },

    async updateCustomDirectoryTarget(
      target: UpdateCustomDirectoryTargetInput,
      updatedAt = new Date()
    ): Promise<void> {
      const targetRows = await db
        .select({
          id: agentTargets.id,
          type: agentTargets.type
        })
        .from(agentTargets)
        .where(eq(agentTargets.id, target.id));
      const existingTarget = targetRows[0];

      if (!existingTarget) {
        throw new Error("Target not found.");
      }

      if (isBuiltInTargetType(existingTarget.type)) {
        throw new Error("System built-in targets cannot be edited.");
      }

      await db
        .update(agentTargets)
        .set({
          detectionStatus: null,
          enabled: true,
          name: target.name,
          normalizedPath: target.normalizedPath,
          path: target.path,
          scanMessage: null,
          type: "custom-directory",
          updatedAt
        })
        .where(eq(agentTargets.id, target.id));
    },

    async registerCustomDirectoryTarget(
      target: RegisterCustomDirectoryTargetInput,
      registeredAt = new Date()
    ): Promise<void> {
      await upsertCustomDirectoryTarget(db, target, "global", registeredAt);
    },

    async registerIndependentDirectoryTarget(
      target: RegisterCustomDirectoryTargetInput,
      registeredAt = new Date()
    ): Promise<void> {
      await upsertCustomDirectoryTarget(db, target, "independent", registeredAt);
    },

    async registerIndependentDirectoryTargetForSkill(
      target: RegisterCustomDirectoryTargetInput,
      skillUnitId: string,
      registeredAt = new Date()
    ): Promise<void> {
      db.transaction((tx) => {
        upsertCustomDirectoryTargetInTransaction(tx, target, "independent", registeredAt);

        tx.insert(skillTargetPreferences)
          .values({
            agentTargetId: target.id,
            createdAt: registeredAt,
            enabled: true,
            id: randomUUID(),
            skillUnitId,
            updatedAt: registeredAt
          })
          .onConflictDoUpdate({
            target: [skillTargetPreferences.skillUnitId, skillTargetPreferences.agentTargetId],
            set: {
              enabled: true,
              updatedAt: registeredAt
            }
          })
          .run();
      });
    },

    async saveScannedTargets(
      targets: (SystemTargetRecord | TargetScanRecord)[],
      scannedAt = new Date()
    ): Promise<void> {
      for (const target of targets) {
        await db
          .insert(agentTargets)
          .values({
            createdAt: scannedAt,
            detectionStatus: target.status,
            enabled: target.status === "detected",
            id: target.id,
            name: target.name,
            normalizedPath: target.normalizedPath,
            path: target.path,
            scanMessage: target.detectionMessage,
            scope: "global",
            type: target.type,
            updatedAt: scannedAt
          })
          .onConflictDoUpdate({
            target: [agentTargets.type, agentTargets.normalizedPath],
            set: {
              detectionStatus: target.status,
              enabled: target.status === "detected",
              name: target.name,
              normalizedPath: target.normalizedPath,
              path: target.path,
              scanMessage: target.detectionMessage,
              type: target.type,
              updatedAt: scannedAt
            }
          });
      }
    }
  };
};

const normalizeTargetIds = (targetIds: string[]): string[] => {
  return Array.from(new Set(targetIds.map((targetId) => targetId.trim()).filter(Boolean)));
};

const upsertCustomDirectoryTarget = async (
  db: DbClient,
  target: RegisterCustomDirectoryTargetInput,
  scope: TargetRegistrationScope,
  registeredAt: Date
): Promise<void> => {
  await db
    .insert(agentTargets)
    .values(buildCustomDirectoryTargetValues(target, scope, registeredAt))
    .onConflictDoUpdate({
      target: [agentTargets.type, agentTargets.normalizedPath],
      set: buildCustomDirectoryTargetConflictSet(target, scope, registeredAt)
    });
};

const upsertCustomDirectoryTargetInTransaction = (
  tx: Parameters<DbClient["transaction"]>[0] extends (tx: infer Tx) => unknown ? Tx : never,
  target: RegisterCustomDirectoryTargetInput,
  scope: TargetRegistrationScope,
  registeredAt: Date
): void => {
  tx.insert(agentTargets)
    .values(buildCustomDirectoryTargetValues(target, scope, registeredAt))
    .onConflictDoUpdate({
      target: [agentTargets.type, agentTargets.normalizedPath],
      set: buildCustomDirectoryTargetConflictSet(target, scope, registeredAt)
    })
    .run();
};

const buildCustomDirectoryTargetValues = (
  target: RegisterCustomDirectoryTargetInput,
  scope: TargetRegistrationScope,
  registeredAt: Date
): AgentTargetInsert => {
  return {
    createdAt: registeredAt,
    enabled: true,
    id: target.id,
    name: target.name,
    normalizedPath: target.normalizedPath,
    path: target.path,
    scope,
    type: "custom-directory",
    updatedAt: registeredAt
  };
};

const buildCustomDirectoryTargetConflictSet = (
  target: RegisterCustomDirectoryTargetInput,
  scope: TargetRegistrationScope,
  registeredAt: Date
): Partial<AgentTargetInsert> => {
  return {
    enabled: true,
    name: target.name,
    normalizedPath: target.normalizedPath,
    path: target.path,
    scope,
    type: "custom-directory",
    updatedAt: registeredAt
  };
};

const normalizeScope = (scope: string): TargetRegistrationScope => {
  if (scope === "independent") {
    return scope;
  }

  return "global";
};

const normalizeStatus = ({
  detectionStatus,
  enabled
}: {
  detectionStatus: string | null;
  enabled: boolean;
}): RegisteredTargetStatus => {
  if (
    detectionStatus === "app-missing" ||
    detectionStatus === "path-missing" ||
    detectionStatus === "not-writable" ||
    detectionStatus === "not-directory" ||
    detectionStatus === "scan-error" ||
    detectionStatus === "missing"
  ) {
    return detectionStatus;
  }

  if (!enabled) {
    return "disabled";
  }

  if (detectionStatus === "detected") {
    return "detected";
  }

  return "registered";
};
