import { dialog, ipcMain, shell } from "electron";
import { cp, mkdir, rm, stat, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { minimatch } from "minimatch";
import { createRepositoryRepository } from "../../db/repositories/repositoryRepository.js";
import {
  deriveSkillPatterns,
  inspectRepositorySource
} from "../../core/repositories/source-inspection.js";
import { scanSkillDirectory } from "../../core/skills/skill-scanner.js";
import { resolveDb, type DbClient, type DbProvider } from "./db-provider.js";
import { getGitHubToken } from "./settings.js";
import type { RepositorySourceInspection } from "../../core/repositories/source-inspection.js";
import type {
  CreateRepositoryInput,
  DeleteRepositoryResult,
  RepositoryApiRecord,
  RepositoryDeletePreview,
  RepositorySyncFailure,
  RepositorySyncFailureCategory,
  RepositorySyncResultItem,
  UpdateRepositoryInput
} from "../../core/repositories/repository-api.js";

export type RepositoriesListResult = {
  repositories: RepositoryApiRecord[];
};

export type RepositoriesSyncResult = {
  results: RepositorySyncResultItem[];
};

type RepositoryInspectionOperations = {
  getGitHubToken: (db: DbClient) => Promise<string | null>;
  inspectLocalSource?: (sourcePath: string) => Promise<RepositorySourceInspection>;
  inspectSource: typeof inspectRepositorySource;
};
type RepositoryFileOperations = {
  removeLocalCache: (localCachePath: string) => Promise<void>;
};
type LocalPathSelectionOperations = {
  showOpenDialog: typeof dialog.showOpenDialog;
};
type RepositoryLocationOperations = {
  openExternal: (url: string) => Promise<void>;
  openPath: (path: string) => Promise<string>;
};
type RepositorySyncOperations = {
  copyLocalSource: (sourcePath: string, cachePath: string) => Promise<void>;
  ensureGitRepository: (remoteUrl: string, cachePath: string, branch: string) => Promise<void>;
  logDirectory?: string;
  materializeSourceCache?: (
    input: SourceCacheMaterializationInput
  ) => Promise<SourceCacheMaterializationResult>;
  resolveCommitSha: (cachePath: string) => Promise<string>;
};

type SourceCacheMaterializationInput = {
  cachePath: string;
  discoveryEntries: string[];
  sourceFolderName: string;
  sourcePath: string;
};

type SourceCacheMaterializationResult = {
  scanDiscoveryEntries: string[];
};

const syncingRepositoryIds = new Set<string>();

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

export const updateRepository = async (
  db: DbClient,
  repositoryId: string,
  input: UpdateRepositoryInput
): Promise<RepositoryApiRecord> => {
  const repositoryRepository = createRepositoryRepository(db);

  return repositoryRepository.update(repositoryId, normalizeUpdateRepositoryInput(input));
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

export const inspectRepositorySourceWithSettings = async (
  db: DbClient,
  remoteUrl: string,
  operations: RepositoryInspectionOperations = {
    getGitHubToken,
    inspectLocalSource: inspectLocalRepositorySource,
    inspectSource: inspectRepositorySource
  }
): Promise<RepositorySourceInspection> => {
  if (isLocalPath(remoteUrl)) {
    return (operations.inspectLocalSource ?? inspectLocalRepositorySource)(
      expandHomePath(remoteUrl)
    );
  }

  return operations.inspectSource(remoteUrl, {
    githubToken: (await operations.getGitHubToken(db)) ?? undefined,
    isDevelopment: isDevelopmentEnvironment()
  });
};

export const selectLocalRepositoryPath = async (
  operations: LocalPathSelectionOperations = {
    showOpenDialog: dialog.showOpenDialog
  }
): Promise<string | null> => {
  const result = await operations.showOpenDialog({
    properties: ["openDirectory"]
  });

  if (result.canceled) {
    return null;
  }

  return result.filePaths[0] ?? null;
};

export const openRepositoryLocation = async (
  location: string,
  operations: RepositoryLocationOperations = {
    openExternal: shell.openExternal,
    openPath: shell.openPath
  }
): Promise<void> => {
  const normalizedLocation = location.trim();

  if (!normalizedLocation) {
    throw new Error("Repository location is required.");
  }

  if (isLocalPath(normalizedLocation)) {
    const errorMessage = await operations.openPath(expandHomePath(normalizedLocation));

    if (errorMessage) {
      throw new Error(errorMessage);
    }

    return;
  }

  await operations.openExternal(toRepositoryWebUrl(normalizedLocation));
};

export const syncRepositories = async (
  db: DbClient,
  repositoryIds: string[],
  operations: RepositorySyncOperations = defaultSyncOperations
): Promise<RepositoriesSyncResult> => {
  const repositoryRepository = createRepositoryRepository(db);
  const repositoriesResult = await getRepositories(db);
  const repositoriesById = new Map(
    repositoriesResult.repositories.map((repository) => [repository.id, repository])
  );
  const results: RepositoriesSyncResult["results"] = [];

  for (const repositoryId of repositoryIds) {
    const repository = repositoriesById.get(repositoryId);

    if (!repository) {
      throw new Error("Repository source not found.");
    }

    if (syncingRepositoryIds.has(repositoryId)) {
      results.push(buildSkippedSyncResult(repositoryId));
      continue;
    }

    syncingRepositoryIds.add(repositoryId);

    const startedAt = new Date();
    let syncRunId: string | null = null;
    const cachePath = expandHomePath(repository.localCachePath);
    const remoteUrl = expandHomePath(repository.remoteUrl);
    const discoveryEntries = getRepositoryDiscoveryEntries(repository.configJson);
    const hasSourceCacheMaterializer = Boolean(operations.materializeSourceCache);
    const sourcePath = isLocalPath(repository.remoteUrl)
      ? remoteUrl
      : hasSourceCacheMaterializer
        ? buildRepositorySourceWorktreePath(cachePath)
        : cachePath;
    let scanDiscoveryEntries = discoveryEntries;

    try {
      syncRunId = await repositoryRepository.startSyncRun({
        repositoryId,
        startedAt
      });

      if (isLocalPath(repository.remoteUrl)) {
        if (operations.materializeSourceCache) {
          const materializedCache = await operations.materializeSourceCache({
            cachePath,
            discoveryEntries,
            sourceFolderName: deriveSourceFolderName(repository.remoteUrl, remoteUrl),
            sourcePath
          });

          scanDiscoveryEntries = materializedCache.scanDiscoveryEntries;
        } else {
          await operations.copyLocalSource(remoteUrl, cachePath);
        }
      } else {
        await operations.ensureGitRepository(repository.remoteUrl, sourcePath, repository.branch);

        if (operations.materializeSourceCache) {
          const materializedCache = await operations.materializeSourceCache({
            cachePath,
            discoveryEntries,
            sourceFolderName: deriveSourceFolderName(repository.remoteUrl, sourcePath),
            sourcePath
          });

          scanDiscoveryEntries = materializedCache.scanDiscoveryEntries;
        }
      }

      const discoveredSkills = await scanSkillDirectory(cachePath, scanDiscoveryEntries);

      if (!discoveredSkills.length) {
        throw new EmptySkillSourceError(cachePath);
      }

      const commitSha = await operations.resolveCommitSha(sourcePath);

      results.push(
        await repositoryRepository.recordSyncResult({
          commitSha,
          discoveredSkills,
          repositoryId,
          startedAt,
          syncRunId
        })
      );
    } catch (error) {
      const failure = await buildSyncFailure({
        cachePath,
        error,
        logDirectory: operations.logDirectory,
        remoteUrl,
        repositoryId
      });

      results.push(
        await repositoryRepository.recordSyncFailure({
          error: failure,
          repositoryId,
          startedAt,
          ...(syncRunId ? { syncRunId } : {})
        })
      );
    } finally {
      syncingRepositoryIds.delete(repositoryId);
    }
  }

  return { results };
};

export const registerRepositoriesIpc = (db: DbProvider): void => {
  ipcMain.handle("repositories:list", (): Promise<RepositoriesListResult> => {
    return getRepositories(resolveDb(db));
  });

  ipcMain.handle(
    "repositories:create",
    (_event, input: CreateRepositoryInput): Promise<RepositoryApiRecord> => {
      return createRepository(resolveDb(db), input);
    }
  );

  ipcMain.handle(
    "repositories:update",
    (_event, repositoryId: string, input: UpdateRepositoryInput): Promise<RepositoryApiRecord> => {
      return updateRepository(resolveDb(db), repositoryId, input);
    }
  );

  ipcMain.handle(
    "repositories:delete",
    (_event, repositoryId: string): Promise<DeleteRepositoryResult> => {
      return deleteRepository(resolveDb(db), repositoryId);
    }
  );

  ipcMain.handle(
    "repositories:getDeletePreview",
    (_event, repositoryId: string): Promise<RepositoryDeletePreview> => {
      return getRepositoryDeletePreview(resolveDb(db), repositoryId);
    }
  );

  ipcMain.handle(
    "repositories:inspectSource",
    async (_event, remoteUrl: string): Promise<RepositorySourceInspection> => {
      return inspectRepositorySourceWithSettings(resolveDb(db), remoteUrl);
    }
  );

  ipcMain.handle("repositories:selectLocalPath", (): Promise<string | null> => {
    return selectLocalRepositoryPath();
  });

  ipcMain.handle("repositories:openLocation", (_event, location: string): Promise<void> => {
    return openRepositoryLocation(location);
  });

  ipcMain.handle(
    "repositories:sync",
    (_event, repositoryIds: string[]): Promise<RepositoriesSyncResult> => {
      return syncRepositories(resolveDb(db), repositoryIds);
    }
  );

  ipcMain.handle("repositories:resolveCachePath", (_event, cachePath: string): Promise<string> => {
    return Promise.resolve(expandHomePath(cachePath));
  });
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
    patterns: input.patterns.trim(),
    provider: input.provider,
    remoteUrl
  };
};

const normalizeUpdateRepositoryInput = (input: UpdateRepositoryInput): UpdateRepositoryInput => {
  const name = input.name.trim();
  const remoteUrl = input.remoteUrl.trim();

  if (!name || !remoteUrl) {
    throw new Error("Repository source name and remote URL are required.");
  }

  return {
    branch: input.branch.trim(),
    ...(typeof input.enabled === "boolean" ? { enabled: input.enabled } : {}),
    name,
    note: input.note.trim(),
    patterns: input.patterns.trim(),
    provider: input.provider,
    remoteUrl
  };
};

const removeRepositoryLocalCache = async (localCachePath: string): Promise<void> => {
  await rm(expandHomePath(localCachePath), { force: true, recursive: true });
};

const inspectLocalRepositorySource = async (
  sourcePath: string
): Promise<RepositorySourceInspection> => {
  const discoveredSkills = await scanSkillDirectory(sourcePath);

  return {
    name: path.basename(path.resolve(sourcePath)),
    patterns: deriveSkillPatterns(discoveredSkills.map((skill) => skill.entryPath)),
    provider: "Local"
  };
};

const defaultSyncOperations: RepositorySyncOperations = {
  async copyLocalSource(sourcePath, cachePath) {
    await rm(cachePath, { force: true, recursive: true });
    await mkdir(path.dirname(cachePath), { recursive: true });
    await cp(sourcePath, cachePath, {
      dereference: false,
      filter: (source) => !source.split(path.sep).includes(".git"),
      force: true,
      recursive: true
    });
  },

  async ensureGitRepository(remoteUrl, cachePath, branch) {
    await mkdir(path.dirname(cachePath), { recursive: true });

    if (await pathExists(path.join(cachePath, ".git"))) {
      await runGit(["-C", cachePath, "fetch", "--prune", "origin"]);
      await runGit(["-C", cachePath, "checkout", branch]);
      await runGit(["-C", cachePath, "pull", "--ff-only", "origin", branch]);
      return;
    }

    await runGit(["clone", "--branch", branch, "--single-branch", remoteUrl, cachePath]);
  },

  materializeSourceCache: materializeSourceCacheFromDiscoveryEntries,

  async resolveCommitSha(cachePath) {
    if (await pathExists(path.join(cachePath, ".git"))) {
      return runGit(["-C", cachePath, "rev-parse", "HEAD"]);
    }

    return "local";
  }
};

async function materializeSourceCacheFromDiscoveryEntries({
  cachePath,
  discoveryEntries,
  sourceFolderName,
  sourcePath
}: SourceCacheMaterializationInput): Promise<SourceCacheMaterializationResult> {
  const normalizedDiscoveryEntries = normalizeSkillDiscoveryEntries(discoveryEntries);

  await rm(cachePath, { force: true, recursive: true });
  await mkdir(cachePath, { recursive: true });

  if (!normalizedDiscoveryEntries.length) {
    await cp(sourcePath, cachePath, {
      dereference: false,
      filter: shouldCopySourceCachePath,
      force: true,
      recursive: true
    });

    return { scanDiscoveryEntries: [] };
  }

  const sourceSkills = await scanSkillDirectory(sourcePath, normalizedDiscoveryEntries);
  const scanDiscoveryEntries: string[] = [];
  const copiedDestinationPaths = new Set<string>();

  for (const skill of sourceSkills) {
    const discoveryEntry = matchingDiscoveryEntry(skill.entryPath, normalizedDiscoveryEntries);
    const destinationRootPath = getMaterializedSkillRootPath({
      discoveryEntry,
      rootPath: skill.rootPath,
      sourceFolderName
    });

    if (copiedDestinationPaths.has(destinationRootPath)) {
      continue;
    }

    copiedDestinationPaths.add(destinationRootPath);
    scanDiscoveryEntries.push(`${destinationRootPath}/SKILL.md`);
    await cp(
      toAbsoluteSourceRootPath(sourcePath, skill.rootPath),
      path.join(cachePath, ...destinationRootPath.split("/")),
      {
        dereference: false,
        filter: shouldCopySourceCachePath,
        force: true,
        recursive: true
      }
    );
  }

  return {
    scanDiscoveryEntries: scanDiscoveryEntries.sort()
  };
}

const normalizeSkillDiscoveryEntries = (entries: string[]): string[] => {
  return entries
    .map((entry) => toPosixPath(entry).trim().replace(/^\.\//, ""))
    .filter((entry) => entry.endsWith("SKILL.md"));
};

const matchingDiscoveryEntry = (entryPath: string, discoveryEntries: string[]): string => {
  return discoveryEntries.find((entry) => minimatch(entryPath, entry, { dot: true })) ?? entryPath;
};

const getMaterializedSkillRootPath = ({
  discoveryEntry,
  rootPath,
  sourceFolderName
}: {
  discoveryEntry: string;
  rootPath: string;
  sourceFolderName: string;
}): string => {
  if (rootPath === ".") {
    return sanitizePathSegment(sourceFolderName) || "repository";
  }

  const discoverySegments = discoveryEntry.split("/");
  const firstWildcardIndex = discoverySegments.findIndex((segment) => segment.includes("*"));

  if (firstWildcardIndex === -1) {
    return normalizeRelativeSkillRootPath(rootPath);
  }

  const prefixSegments = discoverySegments.slice(0, firstWildcardIndex);
  const rootSegments = rootPath.split("/");
  const materializedSegments = rootSegments.slice(prefixSegments.length);

  return normalizeRelativeSkillRootPath(materializedSegments.join("/"));
};

const normalizeRelativeSkillRootPath = (value: string): string => {
  return value.split("/").map(sanitizePathSegment).filter(Boolean).join("/") || "skill";
};

const sanitizePathSegment = (value: string): string => {
  return value
    .replace(/[\\/]+/g, "-")
    .replace(/^\.+$/g, "")
    .trim();
};

const toAbsoluteSourceRootPath = (sourcePath: string, rootPath: string): string => {
  if (rootPath === ".") {
    return sourcePath;
  }

  return path.join(sourcePath, ...rootPath.split("/"));
};

const shouldCopySourceCachePath = (source: string): boolean => {
  return !source.split(path.sep).includes(".git");
};

const toPosixPath = (value: string): string => {
  return value.split(path.sep).join("/");
};

const buildRepositorySourceWorktreePath = (cachePath: string): string => {
  return path.join(path.dirname(cachePath), ".source-repositories", path.basename(cachePath));
};

const deriveSourceFolderName = (remoteUrl: string, fallbackPath: string): string => {
  const trimmedRemoteUrl = remoteUrl
    .trim()
    .replace(/[\\/]+$/, "")
    .replace(/\.git$/i, "");

  try {
    const parsedUrl = new URL(trimmedRemoteUrl);
    const repositoryName = parsedUrl.pathname.replace(/^\/+/, "").split("/").filter(Boolean).pop();

    if (repositoryName) {
      return repositoryName.replace(/\.git$/i, "");
    }
  } catch {
    // Fall through to local path and scp-like Git URL handling.
  }

  const scpLikeMatch = /^(?:[^@\s]+@)?[^:\s]+:(?<path>.+)$/.exec(trimmedRemoteUrl);
  const scpLikeRepositoryName = scpLikeMatch?.groups?.path?.split("/").filter(Boolean).pop();

  if (scpLikeRepositoryName) {
    return scpLikeRepositoryName.replace(/\.git$/i, "");
  }

  return path.basename(path.resolve(fallbackPath)) || "repository";
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

const isLocalPath = (value: string): boolean => {
  return (
    value === "~" ||
    value.startsWith("~/") ||
    value.startsWith(`~${path.sep}`) ||
    /^[A-Za-z]:[\\/]/.test(value) ||
    value.startsWith("/") ||
    value.startsWith(".")
  );
};

const toRepositoryWebUrl = (location: string): string => {
  try {
    const parsedUrl = new URL(location);

    if (parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:") {
      parsedUrl.pathname = stripGitSuffix(parsedUrl.pathname);
      parsedUrl.search = "";
      parsedUrl.hash = "";
      return parsedUrl.toString();
    }

    if (parsedUrl.protocol === "ssh:") {
      return buildRepositoryWebUrl(parsedUrl.hostname, parsedUrl.pathname);
    }
  } catch {
    // Fall through to scp-like Git URL parsing.
  }

  const scpLikeMatch = /^(?:[^@\s]+@)?([^:\s]+):(.+)$/.exec(location);

  if (scpLikeMatch) {
    return buildRepositoryWebUrl(scpLikeMatch[1], scpLikeMatch[2]);
  }

  throw new Error("Unsupported repository location.");
};

const buildRepositoryWebUrl = (host: string, repositoryPath: string): string => {
  const normalizedRepositoryPath = stripGitSuffix(repositoryPath.replace(/^\/+/, ""));

  return `https://${host}/${normalizedRepositoryPath}`;
};

const stripGitSuffix = (value: string): string => {
  return value.replace(/\.git$/i, "");
};

const isDevelopmentEnvironment = (): boolean => {
  return process.env.NODE_ENV === "development" || Boolean(process.env.VITE_DEV_SERVER_URL);
};

const getRepositoryDiscoveryEntries = (configJson: string): string[] => {
  try {
    const parsed = JSON.parse(configJson) as { patterns?: unknown };

    return Array.isArray(parsed.patterns)
      ? parsed.patterns.filter((pattern): pattern is string => typeof pattern === "string")
      : [];
  } catch {
    return [];
  }
};

const pathExists = async (value: string): Promise<boolean> => {
  try {
    await stat(value);
    return true;
  } catch {
    return false;
  }
};

const buildSkippedSyncResult = (repositoryId: string): RepositorySyncResultItem => {
  return {
    repositoryId,
    scan: { added: 0, changed: 0, removed: 0, warnings: 0 },
    skillUnits: 0,
    status: "skipped"
  };
};

class EmptySkillSourceError extends Error {
  constructor(cachePath: string) {
    super(`No SKILL.md files found in ${cachePath}`);
    this.name = "EmptySkillSourceError";
  }
}

const buildSyncFailure = async ({
  cachePath,
  error,
  logDirectory,
  remoteUrl,
  repositoryId
}: {
  cachePath: string;
  error: unknown;
  logDirectory?: string;
  remoteUrl: string;
  repositoryId: string;
}): Promise<RepositorySyncFailure> => {
  const rawError = stringifySyncError(error);
  const category = categorizeSyncError(error, rawError);
  const message = friendlySyncErrorMessage(category);
  const logPath = await writeSyncErrorLog({
    cachePath,
    category,
    message,
    rawError,
    remoteUrl,
    repositoryId,
    rootDirectory: logDirectory
  });

  return {
    category,
    logPath,
    message
  };
};

const categorizeSyncError = (error: unknown, rawError: string): RepositorySyncFailureCategory => {
  const normalized = rawError.toLowerCase();
  const errorCode = typeof error === "object" && error ? (error as { code?: unknown }).code : null;

  if (error instanceof EmptySkillSourceError || normalized.includes("no skill.md files found")) {
    return "not-a-skill";
  }

  if (
    normalized.includes("authentication failed") ||
    normalized.includes("permission denied (publickey)") ||
    normalized.includes("could not read from remote repository") ||
    normalized.includes("repository not found") ||
    normalized.includes("access denied")
  ) {
    return "auth";
  }

  if (
    normalized.includes("connection reset") ||
    normalized.includes("early eof") ||
    normalized.includes("unexpected disconnect") ||
    normalized.includes("could not resolve host") ||
    normalized.includes("failed to connect") ||
    normalized.includes("network is unreachable") ||
    normalized.includes("operation timed out")
  ) {
    return "network";
  }

  if (
    errorCode === "EACCES" ||
    errorCode === "EPERM" ||
    errorCode === "ENOENT" ||
    errorCode === "ENOSPC" ||
    normalized.includes("eacces") ||
    normalized.includes("eperm") ||
    normalized.includes("enoent") ||
    normalized.includes("enospc") ||
    normalized.includes("permission denied") ||
    normalized.includes("no such file or directory") ||
    normalized.includes("read-only file system")
  ) {
    return "filesystem";
  }

  if (normalized.includes("git") || normalized.includes("fatal:")) {
    return "git";
  }

  return "unknown";
};

const friendlySyncErrorMessage = (category: RepositorySyncFailureCategory): string => {
  if (category === "network") {
    return "网络连接中断，暂时无法同步这个 Git 来源。请稍后重试，或检查代理/VPN 后再同步。";
  }

  if (category === "auth") {
    return "没有权限访问这个 Git 来源。请确认仓库地址正确，并在系统 Git/SSH 凭据中完成登录或授权。";
  }

  if (category === "filesystem") {
    return "本地目录无法读取或缓存目录无法写入。请检查路径是否存在、磁盘空间和文件权限。";
  }

  if (category === "not-a-skill") {
    return "没有找到可识别的 Skills。请确认来源目录里包含 SKILL.md。";
  }

  if (category === "source-not-found") {
    return "没有找到这个来源记录，请刷新后重试。";
  }

  if (category === "git") {
    return "Git 同步失败。请检查仓库地址、分支名称和本机 Git 配置后重试。";
  }

  return "同步失败。请稍后重试，或查看同步日志了解详细原因。";
};

const writeSyncErrorLog = async ({
  cachePath,
  category,
  message,
  rawError,
  remoteUrl,
  repositoryId,
  rootDirectory
}: {
  cachePath: string;
  category: RepositorySyncFailureCategory;
  message: string;
  rawError: string;
  remoteUrl: string;
  repositoryId: string;
  rootDirectory?: string;
}): Promise<string | null> => {
  try {
    const directory = rootDirectory ?? path.join(os.homedir(), ".skills-manager", "logs", "sync");
    const timestamp = new Date().toISOString();
    const logPath = path.join(
      directory,
      `${sanitizeLogFileName(repositoryId)}-${timestamp.replace(/[:.]/g, "-")}.log`
    );

    await mkdir(directory, { recursive: true });
    await writeFile(
      logPath,
      [
        `timestamp: ${timestamp}`,
        `repositoryId: ${repositoryId}`,
        `remoteUrl: ${remoteUrl}`,
        `cachePath: ${cachePath}`,
        `category: ${category}`,
        `friendlyMessage: ${message}`,
        "",
        "rawError:",
        rawError
      ].join("\n"),
      "utf8"
    );

    return logPath;
  } catch {
    return null;
  }
};

const sanitizeLogFileName = (value: string): string => {
  return value.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-|-$/g, "") || "repository";
};

const stringifySyncError = (error: unknown): string => {
  if (error instanceof Error) {
    return [error.message, error.stack].filter(Boolean).join("\n");
  }

  if (typeof error === "string") {
    return error;
  }

  try {
    return JSON.stringify(error, null, 2);
  } catch {
    return String(error);
  }
};

const runGit = (args: string[]): Promise<string> => {
  return new Promise((resolve, reject) => {
    const child = spawn("git", args, { stdio: ["ignore", "pipe", "pipe"] });
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];

    child.stdout.on("data", (chunk: Buffer) => stdout.push(chunk));
    child.stderr.on("data", (chunk: Buffer) => stderr.push(chunk));
    child.on("error", reject);
    child.on("close", (code) => {
      const output = Buffer.concat(stdout).toString("utf8").trim();
      const errorOutput = Buffer.concat(stderr).toString("utf8").trim();

      if (code === 0) {
        resolve(output);
        return;
      }

      reject(new Error(errorOutput || `git exited with code ${code ?? "unknown"}`));
    });
  });
};
