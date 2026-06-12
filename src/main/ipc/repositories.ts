import { ipcMain } from "electron";
import { createRepositoryRepository } from "../../db/repositories/repositoryRepository.js";
import { inspectRepositorySource } from "../../core/repositories/source-inspection.js";
import type { RepositorySourceInspection } from "../../core/repositories/source-inspection.js";
import type { RepositoryApiRecord } from "../../core/repositories/repository-api.js";
import type { createDbClient } from "../../db/client.js";

export type RepositoriesListResult = {
  repositories: RepositoryApiRecord[];
};

type DbClient = ReturnType<typeof createDbClient>;

export const getRepositories = async (db: DbClient): Promise<RepositoriesListResult> => {
  const repositoryRepository = createRepositoryRepository(db);

  return {
    repositories: await repositoryRepository.list()
  };
};

export const registerRepositoriesIpc = (db: DbClient): void => {
  ipcMain.handle("repositories:list", (): Promise<RepositoriesListResult> => {
    return getRepositories(db);
  });

  ipcMain.handle(
    "repositories:inspectSource",
    (_event, remoteUrl: string): Promise<RepositorySourceInspection> => {
      return inspectRepositorySource(remoteUrl);
    }
  );
};
