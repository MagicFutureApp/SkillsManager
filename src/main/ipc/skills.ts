import { ipcMain } from "electron";

import type {
  SkillApiRecord,
  UpdateSkillTargetPreferenceInput,
  UpdateSkillTargetPreferenceResult
} from "../../core/skills/skill-api.js";
import { createSkillRepository } from "../../db/repositories/skillRepository.js";
import { resolveDb, type DbClient, type DbProvider } from "./db-provider.js";

export type SkillsListResult = {
  skills: SkillApiRecord[];
};

export type { UpdateSkillTargetPreferenceInput, UpdateSkillTargetPreferenceResult };

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
