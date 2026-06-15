import { ipcMain } from "electron";

import type { SkillApiRecord } from "../../core/skills/skill-api.js";
import type { createDbClient } from "../../db/client.js";
import { createSkillRepository } from "../../db/repositories/skillRepository.js";

export type SkillsListResult = {
  skills: SkillApiRecord[];
};

type DbClient = ReturnType<typeof createDbClient>;

export const getSkills = async (db: DbClient): Promise<SkillsListResult> => {
  const skillRepository = createSkillRepository(db);

  return {
    skills: await skillRepository.list()
  };
};

export const registerSkillsIpc = (db: DbClient): void => {
  ipcMain.handle("skills:list", (): Promise<SkillsListResult> => {
    return getSkills(db);
  });
};
