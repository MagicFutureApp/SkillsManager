import { ipcMain } from "electron";

import type { SkillApiRecord } from "../../core/skills/skill-api.js";
import { createSkillRepository } from "../../db/repositories/skillRepository.js";
import { resolveDb, type DbClient, type DbProvider } from "./db-provider.js";

export type SkillsListResult = {
  skills: SkillApiRecord[];
};

export const getSkills = async (db: DbClient): Promise<SkillsListResult> => {
  const skillRepository = createSkillRepository(db);

  return {
    skills: await skillRepository.list()
  };
};

export const registerSkillsIpc = (db: DbProvider): void => {
  ipcMain.handle("skills:list", (): Promise<SkillsListResult> => {
    return getSkills(resolveDb(db));
  });
};
