import { mkdirSync } from "node:fs";
import { rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { createDbClient } from "../db/client.js";

export type DbClient = ReturnType<typeof createDbClient>;

export type AppStoragePaths = {
  dataDirectory: string;
  databasePath: string;
  repositoryCachePath: string;
};

export type AppDbRuntime = {
  close: () => void;
  getDb: () => DbClient;
  getStoragePaths: () => AppStoragePaths;
  resetDatabase: () => Promise<AppStoragePaths>;
};

type BuildAppStoragePathsInput = {
  dataDirectory: string;
  homeDirectory?: string;
};

type CreateAppDbRuntimeInput = BuildAppStoragePathsInput & {
  createClient?: typeof createDbClient;
};

export const buildAppStoragePaths = ({
  dataDirectory,
  homeDirectory = os.homedir()
}: BuildAppStoragePathsInput): AppStoragePaths => {
  return {
    dataDirectory,
    databasePath: path.join(dataDirectory, "skills-manager.sqlite"),
    repositoryCachePath: path.join(homeDirectory, ".skills-manager", "cache")
  };
};

export const createAppDbRuntime = ({
  createClient = createDbClient,
  dataDirectory,
  homeDirectory
}: CreateAppDbRuntimeInput): AppDbRuntime => {
  const paths = buildAppStoragePaths({ dataDirectory, homeDirectory });
  let db = createDatabase(paths, createClient);

  return {
    close() {
      db.$client.close();
    },

    getDb() {
      return db;
    },

    getStoragePaths() {
      return paths;
    },

    async resetDatabase() {
      db.$client.close();

      await Promise.all(
        [paths.databasePath, `${paths.databasePath}-wal`, `${paths.databasePath}-shm`].map(
          (filePath) => rm(filePath, { force: true })
        )
      );

      db = createDatabase(paths, createClient);

      return paths;
    }
  };
};

const createDatabase = (paths: AppStoragePaths, createClient: typeof createDbClient): DbClient => {
  mkdirSync(paths.dataDirectory, { recursive: true });

  return createClient(paths.databasePath);
};
