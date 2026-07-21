import { and, eq } from "drizzle-orm";
import { ipcMain } from "electron";
import { randomUUID } from "node:crypto";
import { rm } from "node:fs/promises";

import type {
  RemoveSkillTargetPreferenceInput,
  RemoveSkillTargetPreferenceResult,
  SkillApiRecord,
  UpdateSkillTargetPreferenceInput,
  UpdateSkillTargetPreferenceResult
} from "../../core/skills/skill-api.js";
import { createSkillRepository } from "../../db/repositories/skillRepository.js";
import { agentTargets, installInstances, skillTargetPreferences } from "../../db/schema.js";
import { resolveDb, type DbClient, type DbProvider } from "./db-provider.js";
import { resolveSafeInstalledPath } from "../path-utils.js";

export type SkillsListResult = {
  skills: SkillApiRecord[];
};

export type {
  RemoveSkillTargetPreferenceInput,
  RemoveSkillTargetPreferenceResult,
  UpdateSkillTargetPreferenceInput,
  UpdateSkillTargetPreferenceResult
};

export const getSkills = async (db: DbClient): Promise<SkillsListResult> => {
  const skillRepository = createSkillRepository(db);

  return {
    skills: await skillRepository.list()
  };
};

export const setSkillTargetPreference = async (
  db: DbClient,
  input: UpdateSkillTargetPreferenceInput
): Promise<UpdateSkillTargetPreferenceResult> => {
  const skillRepository = createSkillRepository(db);

  await skillRepository.setTargetPreference(normalizeUpdateSkillTargetPreferenceInput(input));

  return { success: true };
};

export const removeSkillTargetPreference = async (
  db: DbClient,
  input: RemoveSkillTargetPreferenceInput
): Promise<RemoveSkillTargetPreferenceResult> => {
  const normalizedInput = normalizeRemoveSkillTargetPreferenceInput(input);
  const installInstance = await getInstallInstanceForSkillTarget(db, normalizedInput);
  const updatedAt = new Date();
  let deletedInstalledPath: string | null = null;

  if (normalizedInput.deleteInstalledFiles && installInstance) {
    const target = await getAgentTarget(db, normalizedInput.agentTargetId);

    if (!target) {
      throw new Error("Target not found.");
    }

    deletedInstalledPath = resolveSafeInstalledPath({
      installedPath: installInstance.installedPath,
      targetPath: target.path
    });
    await rm(deletedInstalledPath, { force: true, recursive: true });
  }

  db.transaction((tx) => {
    if (normalizedInput.removeTargetPreference) {
      tx.delete(skillTargetPreferences)
        .where(
          and(
            eq(skillTargetPreferences.skillUnitId, normalizedInput.skillUnitId),
            eq(skillTargetPreferences.agentTargetId, normalizedInput.agentTargetId)
          )
        )
        .run();
    } else {
      tx.insert(skillTargetPreferences)
        .values({
          agentTargetId: normalizedInput.agentTargetId,
          createdAt: updatedAt,
          enabled: false,
          id: randomUUID(),
          skillUnitId: normalizedInput.skillUnitId,
          updatedAt
        })
        .onConflictDoUpdate({
          target: [skillTargetPreferences.skillUnitId, skillTargetPreferences.agentTargetId],
          set: {
            enabled: false,
            updatedAt
          }
        })
        .run();
    }

    if (normalizedInput.deleteInstalledFiles) {
      tx.delete(installInstances)
        .where(
          and(
            eq(installInstances.skillUnitId, normalizedInput.skillUnitId),
            eq(installInstances.agentTargetId, normalizedInput.agentTargetId)
          )
        )
        .run();
    }
  });

  return {
    deletedInstalledPath,
    success: true
  };
};

export const registerSkillsIpc = (db: DbProvider): void => {
  ipcMain.handle("skills:list", (): Promise<SkillsListResult> => {
    return getSkills(resolveDb(db));
  });

  ipcMain.handle(
    "skills:setTargetPreference",
    (
      _event,
      input: UpdateSkillTargetPreferenceInput
    ): Promise<UpdateSkillTargetPreferenceResult> => {
      return setSkillTargetPreference(resolveDb(db), input);
    }
  );

  ipcMain.handle(
    "skills:removeTargetPreference",
    (
      _event,
      input: RemoveSkillTargetPreferenceInput
    ): Promise<RemoveSkillTargetPreferenceResult> => {
      return removeSkillTargetPreference(resolveDb(db), input);
    }
  );
};

const normalizeUpdateSkillTargetPreferenceInput = (
  input: UpdateSkillTargetPreferenceInput
): UpdateSkillTargetPreferenceInput => {
  const skillUnitId = input.skillUnitId.trim();
  const agentTargetId = input.agentTargetId.trim();

  if (!skillUnitId || !agentTargetId) {
    throw new Error("Skill and target are required.");
  }

  return {
    agentTargetId,
    enabled: Boolean(input.enabled),
    skillUnitId
  };
};

const normalizeRemoveSkillTargetPreferenceInput = (
  input: RemoveSkillTargetPreferenceInput
): RemoveSkillTargetPreferenceInput => {
  const skillUnitId = input.skillUnitId.trim();
  const agentTargetId = input.agentTargetId.trim();

  if (!skillUnitId || !agentTargetId) {
    throw new Error("Skill and target are required.");
  }

  return {
    agentTargetId,
    deleteInstalledFiles: Boolean(input.deleteInstalledFiles),
    removeTargetPreference: Boolean(input.removeTargetPreference),
    skillUnitId
  };
};

const getInstallInstanceForSkillTarget = async (
  db: DbClient,
  input: Pick<RemoveSkillTargetPreferenceInput, "agentTargetId" | "skillUnitId">
) => {
  const rows = await db
    .select({
      installedPath: installInstances.installedPath
    })
    .from(installInstances)
    .where(
      and(
        eq(installInstances.skillUnitId, input.skillUnitId),
        eq(installInstances.agentTargetId, input.agentTargetId)
      )
    )
    .limit(1);

  return rows[0] ?? null;
};

const getAgentTarget = async (db: DbClient, targetId: string) => {
  const rows = await db
    .select({
      path: agentTargets.path
    })
    .from(agentTargets)
    .where(eq(agentTargets.id, targetId))
    .limit(1);

  return rows[0] ?? null;
};
