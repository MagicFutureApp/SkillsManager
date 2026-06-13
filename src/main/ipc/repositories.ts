import { ipcMain } from "electron";
import { createRepositoryRepository } from "../../db/repositories/repositoryRepository.js";
import { inspectRepositorySource } from "../../core/repositories/source-inspection.js";
import type { RepositorySourceInspection } from "../../core/repositories/source-inspection.js";
import type {
  CreateRepositoryInput,
  RepositoryApiRecord
} from "../../core/repositories/repository-api.js";
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

export const createRepository = async (
  db: DbClient,
  input: CreateRepositoryInput
): Promise<RepositoryApiRecord> => {
  const repositoryRepository = createRepositoryRepository(db);

  return repositoryRepository.create(normalizeCreateRepositoryInput(input));
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
