import { ipcMain } from "electron";

import { createRepositoryRepository } from "../../db/repositories/repositoryRepository.js";
import { createSkillRepository } from "../../db/repositories/skillRepository.js";
import { createTargetRepository } from "../../db/repositories/targetRepository.js";
import { resolveDb, type DbClient, type DbProvider } from "./db-provider.js";

export type NavigationBadgeCounts = {
  repositories: number;
  skills: number;
  targets: number;
};

export type NavigationBadgeCountsResult = {
  counts: NavigationBadgeCounts;
};

export const getNavigationBadgeCounts = async (
  db: DbClient
): Promise<NavigationBadgeCountsResult> => {
  const repositoryRepository = createRepositoryRepository(db);
  const skillRepository = createSkillRepository(db);
  const targetRepository = createTargetRepository(db);
  const [repositoryCount, skillCount, targetCount] = await Promise.all([
    repositoryRepository.count(),
    skillRepository.count(),
    targetRepository.count()
  ]);

  return {
    counts: {
      repositories: repositoryCount,
      skills: skillCount,
      targets: targetCount
    }
  };
};

export const registerNavigationBadgesIpc = (db: DbProvider): void => {
  ipcMain.handle("navigation:getBadgeCounts", (): Promise<NavigationBadgeCountsResult> => {
    return getNavigationBadgeCounts(resolveDb(db));
  });
};
