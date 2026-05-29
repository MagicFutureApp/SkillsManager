import { ipcMain } from "electron";
import { defaultRepositoryApiRecords } from "../../core/repositories/repository-api.js";
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
};
