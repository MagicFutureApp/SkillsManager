import { ipcMain, shell } from "electron";
import { createAppSettingsRepository } from "../../db/repositories/appSettingsRepository.js";
import type { AppDbRuntime, AppStoragePaths } from "../app-storage.js";
import type { createDbClient } from "../../db/client.js";

const GITHUB_TOKEN_SETTING_KEY = "githubToken";

type DbClient = ReturnType<typeof createDbClient>;
type OpenExternalOperations = {
  openExternal: (url: string) => Promise<void>;
};

export type AppSettingsResult = {
  github: {
    hasToken: boolean;
  };
};

export type AppStoragePathsResult = {
  databasePath: string;
  localCachePath: string;
};

export type ResetLocalDatabaseResult = {
  settings: AppSettingsResult;
  storage: AppStoragePathsResult;
};

export const getGitHubToken = async (db: DbClient): Promise<string | null> => {
  const setting = await createAppSettingsRepository(db).get(GITHUB_TOKEN_SETTING_KEY);

  if (!setting) {
    return null;
  }

  try {
    const parsed = JSON.parse(setting.valueJson) as unknown;

    return typeof parsed === "string" && parsed.trim() ? parsed.trim() : null;
  } catch {
    return null;
  }
};

export const getAppSettings = async (db: DbClient): Promise<AppSettingsResult> => {
  return {
    github: {
      hasToken: Boolean(await getGitHubToken(db))
    }
  };
};

export const saveGitHubToken = async (db: DbClient, token: string): Promise<AppSettingsResult> => {
  const normalizedToken = token.trim();

  if (!normalizedToken) {
    throw new Error("GitHub token is required.");
  }

  await createAppSettingsRepository(db).set(GITHUB_TOKEN_SETTING_KEY, normalizedToken);

  return getAppSettings(db);
};

export const clearGitHubToken = async (db: DbClient): Promise<AppSettingsResult> => {
  await createAppSettingsRepository(db).delete(GITHUB_TOKEN_SETTING_KEY);

  return getAppSettings(db);
};

export const getAppStoragePaths = (paths: AppStoragePaths): AppStoragePathsResult => {
  return {
    databasePath: paths.databasePath,
    localCachePath: paths.repositoryCachePath
  };
};

export const resetLocalDatabase = async (
  runtime: Pick<AppDbRuntime, "getDb" | "resetDatabase">
): Promise<ResetLocalDatabaseResult> => {
  const paths = await runtime.resetDatabase();

  return {
    settings: await getAppSettings(runtime.getDb()),
    storage: getAppStoragePaths(paths)
  };
};

export const openExternalUrl = async (
  url: string,
  operations: OpenExternalOperations = shell
): Promise<void> => {
  const parsedUrl = new URL(url);

  if (parsedUrl.protocol !== "https:" || parsedUrl.hostname !== "github.com") {
    throw new Error("Only GitHub URLs can be opened from settings.");
  }

  await operations.openExternal(url);
};

export const registerSettingsIpc = (runtime: AppDbRuntime): void => {
  ipcMain.handle("settings:get", (): Promise<AppSettingsResult> => {
    return getAppSettings(runtime.getDb());
  });

  ipcMain.handle("settings:getStoragePaths", (): AppStoragePathsResult => {
    return getAppStoragePaths(runtime.getStoragePaths());
  });

  ipcMain.handle("settings:resetLocalDatabase", (): Promise<ResetLocalDatabaseResult> => {
    return resetLocalDatabase(runtime);
  });

  ipcMain.handle(
    "settings:saveGitHubToken",
    (_event, token: string): Promise<AppSettingsResult> => {
      return saveGitHubToken(runtime.getDb(), token);
    }
  );

  ipcMain.handle("settings:clearGitHubToken", (): Promise<AppSettingsResult> => {
    return clearGitHubToken(runtime.getDb());
  });

  ipcMain.handle("settings:openExternalUrl", (_event, url: string): Promise<void> => {
    return openExternalUrl(url);
  });
};
