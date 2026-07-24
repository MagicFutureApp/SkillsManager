import { readdir, rm, stat } from "node:fs/promises";
import path from "node:path";
import { dialog, ipcMain } from "electron";

import type {
  AgentTargetType,
  RegisteredTargetRecord,
  TargetDetectionStatus,
  TargetScanCandidate,
  TargetScanIssue,
  TargetScanRecord
} from "../../core/targets/target-api.js";
import {
  agentTargetDirectoryDefinitions,
  joinTargetPath,
  normalizeTargetPath,
  scanRegisteredTargets,
  scanSystemTargets
} from "../../core/targets/target-scanner.js";
import {
  buildCustomDirectoryTargetId,
  deriveCustomDirectoryTargetName
} from "../../core/targets/target-utils.js";
import { createTargetRepository } from "../../db/repositories/targetRepository.js";
import { resolveDb, type DbClient, type DbProvider } from "./db-provider.js";
import { resolveSafeInstalledPath } from "../path-utils.js";

export type TargetsListResult = {
  registeredTargets: RegisteredTargetRecord[];
};

export type TargetsRescanResult = TargetsListResult & {
  scanIssues: TargetScanIssue[];
};

export type AddSkillDirectoryTargetInput = {
  name?: string;
  skillUnitId: string;
  targetPath: string;
};

export type AddCustomDirectoryTargetInput =
  | string
  | {
      name: string;
      targetPath: string;
    };

export type DeleteTargetsInput = {
  deleteInstalledFiles?: boolean;
  targetIds: string[];
};

export type UpdateCustomDirectoryTargetInput = {
  name: string;
  targetId: string;
  targetPath: string;
};

export type TargetDirectoryAgentOption = {
  directoryName: string;
  name: string;
  targetPath: string;
  type: Exclude<AgentTargetType, "custom-directory">;
};

export type SelectedTargetDirectoryResolution =
  | {
      status: "resolved";
      targetPath: string;
    }
  | {
      basePath: string;
      customDirectoryName?: string;
      options: TargetDirectoryAgentOption[];
      selectedAgentType?: string;
      status: "requires-agent-type";
      targetPath?: string;
    };

type TargetsRescanOperations = {
  now: () => Date;
  scanRegisteredTargets: typeof scanRegisteredTargets;
  scanSystemTargets: typeof scanSystemTargets;
};
type TargetDirectorySelectionOperations = {
  showOpenDialog: typeof dialog.showOpenDialog;
};
type ResolveSelectedTargetDirectoryOperations = {
  isDirectory?: (candidatePath: string) => Promise<boolean>;
  readDirectory?: (directoryPath: string) => Promise<string[]>;
};
type AddCustomDirectoryTargetOperations = {
  now: () => Date;
};

const defaultCustomAgentDirectoryName = ".agents";

export const getTargets = async (db: DbClient): Promise<TargetsListResult> => {
  const targetRepository = createTargetRepository(db);

  return {
    registeredTargets: await targetRepository.list()
  };
};

export const selectTargetDirectory = async (
  operations: TargetDirectorySelectionOperations = {
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

export const resolveSelectedTargetDirectory = async (
  selectedPath: string,
  {
    isDirectory = pathIsDirectory,
    readDirectory = readDirectoryNames
  }: ResolveSelectedTargetDirectoryOperations = {}
): Promise<SelectedTargetDirectoryResolution> => {
  const targetPath = normalizeTargetPath(selectedPath.trim());

  if (!targetPath) {
    throw new Error("Target directory is required.");
  }

  if (getPathBasename(targetPath).toLowerCase() === "skills") {
    const agentDirectoryPath = getPathDirname(targetPath);
    const agentDirectoryName = getPathBasename(agentDirectoryPath);
    const knownDefinition = getKnownAgentDirectoryDefinition(agentDirectoryName);

    if (knownDefinition) {
      return createTargetDirectoryAgentTypeResolution({
        basePath: getPathDirname(agentDirectoryPath),
        selectedAgentType: knownDefinition.type,
        targetPath
      });
    }

    if (isCustomAgentDirectoryName(agentDirectoryName)) {
      return createTargetDirectoryAgentTypeResolution({
        basePath: getPathDirname(agentDirectoryPath),
        customDirectoryName: agentDirectoryName,
        selectedAgentType: "custom",
        targetPath
      });
    }

    return {
      status: "resolved",
      targetPath
    };
  }

  const selectedDirectoryName = getPathBasename(targetPath);
  const knownSelectedDirectoryDefinition = getKnownAgentDirectoryDefinition(selectedDirectoryName);

  if (knownSelectedDirectoryDefinition) {
    return createTargetDirectoryAgentTypeResolution({
      basePath: getPathDirname(targetPath),
      selectedAgentType: knownSelectedDirectoryDefinition.type,
      targetPath: joinTargetPath(targetPath, "skills")
    });
  }

  const directSkillsPath = joinTargetPath(targetPath, "skills");

  if (await isDirectory(directSkillsPath)) {
    return {
      status: "resolved",
      targetPath: directSkillsPath
    };
  }

  const childDirectoryNames = await safeReadDirectory(targetPath, readDirectory);

  for (const childDirectoryName of prioritizeTargetDirectoryNames(childDirectoryNames)) {
    const childSkillsPath = joinTargetPath(targetPath, childDirectoryName, "skills");

    if (await isDirectory(childSkillsPath)) {
      const knownChildDirectoryDefinition = getKnownAgentDirectoryDefinition(childDirectoryName);

      if (knownChildDirectoryDefinition) {
        return createTargetDirectoryAgentTypeResolution({
          basePath: targetPath,
          selectedAgentType: knownChildDirectoryDefinition.type,
          targetPath: childSkillsPath
        });
      }

      return createTargetDirectoryAgentTypeResolution({
        basePath: targetPath,
        customDirectoryName: childDirectoryName,
        selectedAgentType: "custom",
        targetPath: childSkillsPath
      });
    }
  }

  return createTargetDirectoryAgentTypeResolution({
    basePath: targetPath,
    customDirectoryName: defaultCustomAgentDirectoryName,
    selectedAgentType: "custom",
    targetPath: joinTargetPath(targetPath, defaultCustomAgentDirectoryName, "skills")
  });
};

export const addCustomDirectoryTarget = async (
  db: DbClient,
  input: AddCustomDirectoryTargetInput,
  operations: AddCustomDirectoryTargetOperations = {
    now: () => new Date()
  }
): Promise<TargetsListResult> => {
  const { name, targetPath } = normalizeCustomDirectoryTargetInput(input);
  const normalizedPath = normalizeTargetPath(targetPath);
  const targetRepository = createTargetRepository(db);

  await targetRepository.registerCustomDirectoryTarget(
    {
      id: buildCustomDirectoryTargetId(normalizedPath),
      name,
      normalizedPath,
      path: targetPath
    },
    operations.now()
  );

  return getTargets(db);
};

export const addSkillDirectoryTarget = async (
  db: DbClient,
  input: AddSkillDirectoryTargetInput,
  operations: AddCustomDirectoryTargetOperations = {
    now: () => new Date()
  }
): Promise<TargetsListResult> => {
  const skillUnitId = input.skillUnitId.trim();
  const name = input.name?.trim() || deriveCustomDirectoryTargetName(input.targetPath);
  const targetPath = input.targetPath.trim();

  if (!skillUnitId || !name || !targetPath) {
    throw new Error("Skill and target directory are required.");
  }

  const normalizedPath = normalizeTargetPath(targetPath);
  const targetRepository = createTargetRepository(db);

  await targetRepository.registerIndependentDirectoryTargetForSkill(
    {
      id: buildCustomDirectoryTargetId(normalizedPath),
      name,
      normalizedPath,
      path: targetPath
    },
    skillUnitId,
    operations.now()
  );

  return getTargets(db);
};

export const deleteTargets = async (
  db: DbClient,
  input: DeleteTargetsInput
): Promise<TargetsListResult> => {
  const targetIds = normalizeTargetIds(input.targetIds);
  const deleteInstalledFiles = Boolean(input.deleteInstalledFiles);

  if (!targetIds.length) {
    throw new Error("At least one target is required.");
  }

  const targetRepository = createTargetRepository(db);

  if (deleteInstalledFiles) {
    const installedFiles = await targetRepository.listInstalledSkillFilesForTargets(targetIds);
    const installedPaths = installedFiles.map((file) =>
      resolveSafeInstalledPath({
        installedPath: file.installedPath,
        targetPath: file.targetPath
      })
    );

    await Promise.all(
      installedPaths.map((installedPath) => rm(installedPath, { force: true, recursive: true }))
    );
  }

  await targetRepository.deleteTargets(targetIds, {
    deleteInstallInstances: deleteInstalledFiles
  });

  return getTargets(db);
};

export const updateCustomDirectoryTarget = async (
  db: DbClient,
  input: UpdateCustomDirectoryTargetInput,
  operations: AddCustomDirectoryTargetOperations = {
    now: () => new Date()
  }
): Promise<TargetsListResult> => {
  const targetId = input.targetId.trim();
  const name = input.name.trim();
  const targetPath = input.targetPath.trim();

  if (!targetId || !name || !targetPath) {
    throw new Error("Target, name, and directory are required.");
  }

  const normalizedPath = normalizeTargetPath(targetPath);
  const targetRepository = createTargetRepository(db);

  await targetRepository.updateCustomDirectoryTarget(
    {
      id: targetId,
      name,
      normalizedPath,
      path: targetPath
    },
    operations.now()
  );

  return getTargets(db);
};

export const rescanTargets = async (
  db: DbClient,
  operations: TargetsRescanOperations = {
    now: () => new Date(),
    scanRegisteredTargets,
    scanSystemTargets
  }
): Promise<TargetsRescanResult> => {
  const targetRepository = createTargetRepository(db);
  const scannedTargets = await operations.scanSystemTargets();
  const scannedAt = operations.now();

  await targetRepository.saveScannedTargets(scannedTargets, scannedAt);

  const systemTargetKeys = new Set(scannedTargets.map(createTargetIdentityKey));
  const registeredTargetCandidates = (await targetRepository.listScanCandidates()).filter(
    (target) => !systemTargetKeys.has(createTargetIdentityKey(target))
  );
  const rescannedRegisteredTargets = await operations.scanRegisteredTargets(
    registeredTargetCandidates
  );

  await targetRepository.saveScannedTargets(rescannedRegisteredTargets, scannedAt);

  const registeredTargets = await targetRepository.list();

  return {
    registeredTargets,
    scanIssues: createScanIssues([...scannedTargets, ...rescannedRegisteredTargets])
  };
};

export const registerTargetsIpc = (db: DbProvider): void => {
  ipcMain.handle("targets:list", (): Promise<TargetsListResult> => {
    return getTargets(resolveDb(db));
  });
  ipcMain.handle("targets:rescan", (): Promise<TargetsRescanResult> => {
    return rescanTargets(resolveDb(db));
  });
  ipcMain.handle("targets:selectDirectory", (): Promise<string | null> => {
    return selectTargetDirectory();
  });
  ipcMain.handle(
    "targets:resolveSelectedDirectory",
    (_event, selectedPath: string): Promise<SelectedTargetDirectoryResolution> => {
      return resolveSelectedTargetDirectory(selectedPath);
    }
  );
  ipcMain.handle(
    "targets:addCustomDirectory",
    (_event, input: AddCustomDirectoryTargetInput): Promise<TargetsListResult> => {
      return addCustomDirectoryTarget(resolveDb(db), input);
    }
  );
  ipcMain.handle(
    "targets:addSkillDirectory",
    (_event, input: AddSkillDirectoryTargetInput): Promise<TargetsListResult> => {
      return addSkillDirectoryTarget(resolveDb(db), input);
    }
  );
  ipcMain.handle(
    "targets:updateCustomDirectory",
    (_event, input: UpdateCustomDirectoryTargetInput): Promise<TargetsListResult> => {
      return updateCustomDirectoryTarget(resolveDb(db), input);
    }
  );
  ipcMain.handle(
    "targets:delete",
    (_event, input: DeleteTargetsInput): Promise<TargetsListResult> => {
      return deleteTargets(resolveDb(db), input);
    }
  );
};

const normalizeTargetIds = (targetIds: string[]): string[] => {
  return Array.from(new Set(targetIds.map((targetId) => targetId.trim()).filter(Boolean)));
};

const createTargetDirectoryAgentTypeResolution = ({
  basePath,
  customDirectoryName,
  selectedAgentType,
  targetPath
}: {
  basePath: string;
  customDirectoryName?: string;
  selectedAgentType?: string;
  targetPath?: string;
}): SelectedTargetDirectoryResolution => ({
  basePath,
  ...(customDirectoryName !== undefined ? { customDirectoryName } : {}),
  options: createTargetDirectoryAgentOptions(basePath),
  ...(selectedAgentType ? { selectedAgentType } : {}),
  status: "requires-agent-type",
  ...(targetPath ? { targetPath } : {})
});

const createTargetDirectoryAgentOptions = (basePath: string): TargetDirectoryAgentOption[] => {
  return agentTargetDirectoryDefinitions.map((definition) => ({
    directoryName: definition.directoryName,
    name: definition.name,
    targetPath: joinTargetPath(basePath, definition.directoryName, "skills"),
    type: definition.type
  }));
};

const getKnownAgentDirectoryDefinition = (directoryName: string) => {
  return agentTargetDirectoryDefinitions.find(
    (definition) => definition.directoryName === directoryName
  );
};

const isCustomAgentDirectoryName = (directoryName: string): boolean => {
  return directoryName.startsWith(".") && !getKnownAgentDirectoryDefinition(directoryName);
};

const prioritizeTargetDirectoryNames = (directoryNames: string[]): string[] => {
  const uniqueDirectoryNames = Array.from(new Set(directoryNames));
  const knownDirectoryNames = agentTargetDirectoryDefinitions
    .map((definition) => definition.directoryName)
    .filter((directoryName) => uniqueDirectoryNames.includes(directoryName));
  const remainingDirectoryNames = uniqueDirectoryNames
    .filter((directoryName) => !knownDirectoryNames.includes(directoryName))
    .sort((left, right) => left.localeCompare(right));

  return [...knownDirectoryNames, ...remainingDirectoryNames];
};

const safeReadDirectory = async (
  directoryPath: string,
  readDirectory: (directoryPath: string) => Promise<string[]>
): Promise<string[]> => {
  try {
    return await readDirectory(directoryPath);
  } catch {
    return [];
  }
};

const readDirectoryNames = async (directoryPath: string): Promise<string[]> => {
  return readdir(directoryPath);
};

const pathIsDirectory = async (candidatePath: string): Promise<boolean> => {
  try {
    const candidateStat = await stat(candidatePath);
    return candidateStat.isDirectory();
  } catch {
    return false;
  }
};

const getPathBasename = (targetPath: string): string => {
  if (/^[A-Za-z]:[\\/]/.test(targetPath)) {
    return path.win32.basename(targetPath);
  }

  if (targetPath.startsWith("/")) {
    return path.posix.basename(targetPath);
  }

  return path.basename(targetPath);
};

const getPathDirname = (targetPath: string): string => {
  if (/^[A-Za-z]:[\\/]/.test(targetPath)) {
    return path.win32.dirname(targetPath);
  }

  if (targetPath.startsWith("/")) {
    return path.posix.dirname(targetPath);
  }

  return path.dirname(targetPath);
};

const normalizeCustomDirectoryTargetInput = (
  input: AddCustomDirectoryTargetInput
): { name: string; targetPath: string } => {
  const targetPath = typeof input === "string" ? input.trim() : input.targetPath.trim();
  const name =
    typeof input === "string"
      ? deriveCustomDirectoryTargetName(targetPath)
      : input.name.trim() || deriveCustomDirectoryTargetName(targetPath);

  if (!targetPath || !name) {
    throw new Error("Target name and directory are required.");
  }

  return {
    name,
    targetPath
  };
};

const createTargetIdentityKey = (target: TargetScanCandidate): string => {
  return `${target.type}\u0000${target.normalizedPath}`;
};

const createScanIssues = (targets: TargetScanRecord[]): TargetScanIssue[] => {
  return targets.filter(isScanIssue).map((target) => ({
    id: target.id,
    message: target.detectionMessage,
    name: target.name,
    path: target.path,
    status: target.status,
    type: target.type
  }));
};

const isScanIssue = (
  target: TargetScanRecord
): target is TargetScanRecord & {
  status: Exclude<TargetDetectionStatus, "detected">;
} => {
  return target.status !== "detected";
};
