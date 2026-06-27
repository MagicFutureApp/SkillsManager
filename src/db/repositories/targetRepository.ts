import { asc, count, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";

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
import { agentTargets, repositories, skillTargetPreferences, skillUnits } from "../schema";

type DbClient = ReturnType<typeof createDbClient>;

type RegisterCustomDirectoryTargetInput = {
  id: string;
  name: string;
  normalizedPath: string;
  path: string;
};
type AgentTargetInsert = typeof agentTargets.$inferInsert;

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
          defaultInstallStrategy: target.defaultInstallStrategy,
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
        defaultInstallStrategy: target.defaultInstallStrategy,
        id: target.id,
        name: target.name,
        normalizedPath: target.normalizedPath,
        path: target.path,
        type: target.type
      }));
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
            defaultInstallStrategy: target.defaultInstallStrategy,
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
              defaultInstallStrategy: target.defaultInstallStrategy,
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
    defaultInstallStrategy: "copy",
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
    defaultInstallStrategy: "copy",
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
