import { ipcMain, shell } from "electron";
import { createAppSettingsRepository } from "../../db/repositories/appSettingsRepository";
import type { AppDbRuntime, AppStoragePaths } from "../app-storage";
import type { createDbClient } from "../../db/client";
import { GITHUB_TOKEN_HELP_URL, OFFICIAL_SITE_URL } from "../../core/app-constants";

const GITHUB_TOKEN_SETTING_KEY = "githubToken";
const DISTRIBUTION_SETTINGS_KEY = "distribution";

type DbClient = ReturnType<typeof createDbClient>;
type OpenExternalOperations = {
  openExternal: (url: string) => Promise<void>;
};

export type AppSettingsResult = {
  distribution: DistributionSettings;
  github: {
    hasToken: boolean;
  };
};

export type DistributionSettings = {
  autoDistributeOnSync: boolean;
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
    distribution: await getDistributionSettings(db),
    github: {
      hasToken: Boolean(await getGitHubToken(db))
    }
  };
};

export const getDistributionSettings = async (db: DbClient): Promise<DistributionSettings> => {
  const setting = await createAppSettingsRepository(db).get(DISTRIBUTION_SETTINGS_KEY);

  if (!setting) {
    return { autoDistributeOnSync: false };
  }

  try {
    const parsed = JSON.parse(setting.valueJson) as Partial<DistributionSettings>;

    return {
      autoDistributeOnSync: parsed.autoDistributeOnSync === true
    };
  } catch {
    return { autoDistributeOnSync: false };
  }
};

export const updateDistributionSettings = async (db: DbClient, settings: Partial<DistributionSettings>): Promise<AppSettingsResult> => {
  const nextSettings: DistributionSettings = {
    autoDistributeOnSync: settings.autoDistributeOnSync === true
  };

  await createAppSettingsRepository(db).set(DISTRIBUTION_SETTINGS_KEY, nextSettings);

  return getAppSettings(db);
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

export const resetLocalDatabase = async (runtime: Pick<AppDbRuntime, "getDb" | "resetDatabase">): Promise<ResetLocalDatabaseResult> => {
  const paths = await runtime.resetDatabase();

  return {
    settings: await getAppSettings(runtime.getDb()),
    storage: getAppStoragePaths(paths)
  };
};

/** Fixed third party hosts; the app's own host is injected at build time. */
const EXTERNAL_URL_FIXED_HOSTNAMES = ["github.com", "skills.sh", "www.skills.sh"] as const;

const toHostname = (url: string): string => {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
};

/**
 * An unconfigured base URL contributes no hostname instead of throwing, so a
 * misconfigured build still opens the fixed third party links.
 */
export const buildExternalUrlAllowedHostnames = (appBaseUrl: string): Set<string> => {
  const appHostname = toHostname(appBaseUrl);

  return new Set(appHostname ? [...EXTERNAL_URL_FIXED_HOSTNAMES, appHostname] : EXTERNAL_URL_FIXED_HOSTNAMES);
};

const EXTERNAL_URL_ALLOWED_HOSTNAMES = buildExternalUrlAllowedHostnames(OFFICIAL_SITE_URL);

export const openExternalUrl = async (url: string, operations: OpenExternalOperations = shell): Promise<void> => {
  let parsedUrl: URL;

  try {
    parsedUrl = new URL(url);
  } catch {
    throw new Error("Only approved settings URLs can be opened.");
  }

  if (parsedUrl.protocol !== "https:" || !EXTERNAL_URL_ALLOWED_HOSTNAMES.has(parsedUrl.hostname)) {
    throw new Error("Only approved settings URLs can be opened.");
  }

  await operations.openExternal(url);
};

/**
 * Semantic identifiers for the app's own pages. The renderer only knows these
 * keys; resolving them to URLs stays in the main process so no build time
 * configuration ever reaches the renderer bundle.
 */
export type AppUrlKind = "githubTokenHelp" | "officialSite";

export type AppUrls = Record<AppUrlKind, string>;

const APP_URLS: AppUrls = {
  githubTokenHelp: GITHUB_TOKEN_HELP_URL,
  officialSite: OFFICIAL_SITE_URL
};

/** `kind` arrives from the renderer, so it is validated rather than trusted. */
export const resolveAppUrl = (kind: unknown, urls: AppUrls = APP_URLS): string => {
  if (typeof kind !== "string" || !Object.hasOwn(urls, kind)) {
    throw new Error("Unknown app URL.");
  }

  const url = urls[kind as AppUrlKind];

  if (!url) {
    throw new Error("This app URL is not configured in the current build.");
  }

  return url;
};

export const openAppUrl = async (kind: unknown, operations: OpenExternalOperations = shell): Promise<void> => {
  await openExternalUrl(resolveAppUrl(kind), operations);
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

  ipcMain.handle("settings:saveGitHubToken", (_event, token: string): Promise<AppSettingsResult> => {
    return saveGitHubToken(runtime.getDb(), token);
  });

  ipcMain.handle("settings:clearGitHubToken", (): Promise<AppSettingsResult> => {
    return clearGitHubToken(runtime.getDb());
  });

  ipcMain.handle("settings:updateDistributionSettings", (_event, settings: Partial<DistributionSettings>): Promise<AppSettingsResult> => {
    return updateDistributionSettings(runtime.getDb(), settings);
  });

  ipcMain.handle("settings:openExternalUrl", (_event, url: string): Promise<void> => {
    return openExternalUrl(url);
  });

  ipcMain.handle("settings:openAppUrl", (_event, kind: unknown): Promise<void> => {
    return openAppUrl(kind);
  });
};
