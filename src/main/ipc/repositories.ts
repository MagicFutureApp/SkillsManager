import { ipcMain } from "electron";
import { rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createRepositoryRepository } from "../../db/repositories/repositoryRepository.js";
import { inspectRepositorySource } from "../../core/repositories/source-inspection.js";
import type { RepositorySourceInspection } from "../../core/repositories/source-inspection.js";
import type {
  CreateRepositoryInput,
  DeleteRepositoryResult,
  RepositoryApiRecord,
  RepositoryDeletePreview
} from "../../core/repositories/repository-api.js";
import type { createDbClient } from "../../db/client.js";

export type RepositoriesListResult = {
  repositories: RepositoryApiRecord[];
};

type DbClient = ReturnType<typeof createDbClient>;
type RepositoryFileOperations = {
  removeLocalCache: (localCachePath: string) => Promise<void>;
};

export const getRepositories = async (db: DbClient): Promise<RepositoriesListResult> => {
  const repositoryRepository = createRepositoryRepository(db);

  return {
    repositories: await repositoryRepository.list()
  };
};

export const createRepository = async (
  db: DbClient,
  input: CreateRepositoryInput
): Promise<RepositoryApiRecord> => {
  const repositoryRepository = createRepositoryRepository(db);

  return repositoryRepository.create(normalizeCreateRepositoryInput(input));
};

export const deleteRepository = async (
  db: DbClient,
  repositoryId: string,
  files: RepositoryFileOperations = { removeLocalCache: removeRepositoryLocalCache }
): Promise<DeleteRepositoryResult> => {
  const repositoryRepository = createRepositoryRepository(db);
  const preview = await repositoryRepository.getDeletePreview(repositoryId);

  await files.removeLocalCache(preview.localCachePath);

  return repositoryRepository.delete(repositoryId);
};

export const getRepositoryDeletePreview = async (
  db: DbClient,
  repositoryId: string
): Promise<RepositoryDeletePreview> => {
  const repositoryRepository = createRepositoryRepository(db);

  return repositoryRepository.getDeletePreview(repositoryId);
};

export const registerRepositoriesIpc = (db: DbClient): void => {
  ipcMain.handle("repositories:list", (): Promise<RepositoriesListResult> => {
    return getRepositories(db);
  });

  ipcMain.handle(
    "repositories:create",
    (_event, input: CreateRepositoryInput): Promise<RepositoryApiRecord> => {
      return createRepository(db, input);
    }
  );

  ipcMain.handle(
    "repositories:delete",
    (_event, repositoryId: string): Promise<DeleteRepositoryResult> => {
      return deleteRepository(db, repositoryId);
    }
  );

  ipcMain.handle(
    "repositories:getDeletePreview",
    (_event, repositoryId: string): Promise<RepositoryDeletePreview> => {
      return getRepositoryDeletePreview(db, repositoryId);
    }
  );

  ipcMain.handle(
    "repositories:inspectSource",
    (_event, remoteUrl: string): Promise<RepositorySourceInspection> => {
      return inspectRepositorySource(remoteUrl);
    }
  );
};

const normalizeCreateRepositoryInput = (input: CreateRepositoryInput): CreateRepositoryInput => {
  const name = input.name.trim();
  const remoteUrl = input.remoteUrl.trim();

  if (!name || !remoteUrl) {
    throw new Error("Repository source name and remote URL are required.");
  }

  return {
    branch: input.branch.trim() || "main",
    name,
    note: input.note.trim(),
    patterns: input.patterns.map((pattern) => pattern.trim()).filter(Boolean),
    provider: input.provider,
    remoteUrl
  };
};

const removeRepositoryLocalCache = async (localCachePath: string): Promise<void> => {
  await rm(expandHomePath(localCachePath), { force: true, recursive: true });
};

const expandHomePath = (value: string): string => {
  if (value === "~") {
    return os.homedir();
  }

  if (value.startsWith(`~${path.sep}`) || value.startsWith("~/")) {
    return path.join(os.homedir(), value.slice(2));
  }

  return value;
};
