import { ipcMain } from "electron";
import { defaultRepositoryApiRecords } from "../../core/repositories/repository-api.js";
import { inspectRepositorySource } from "../../core/repositories/source-inspection.js";
import type { RepositorySourceInspection } from "../../core/repositories/source-inspection.js";
import type { RepositoryApiRecord } from "../../core/repositories/repository-api.js";

export type RepositoriesListResult = {
  repositories: RepositoryApiRecord[];
};

export const getRepositories = (): RepositoriesListResult => {
  return {
    repositories: defaultRepositoryApiRecords
  };
};

export const registerRepositoriesIpc = (): void => {
  ipcMain.handle("repositories:list", (): RepositoriesListResult => {
    return getRepositories();
  });

  ipcMain.handle(
    "repositories:inspectSource",
    (_event, remoteUrl: string): Promise<RepositorySourceInspection> => {
      return inspectRepositorySource(remoteUrl);
    }
  );
};
