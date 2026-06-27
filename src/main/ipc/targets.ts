import { dialog, ipcMain } from "electron";

import type {
  RegisteredTargetRecord,
  TargetDetectionStatus,
  TargetScanCandidate,
  TargetScanIssue,
  TargetScanRecord
} from "../../core/targets/target-api.js";
import { scanRegisteredTargets, scanSystemTargets } from "../../core/targets/target-scanner.js";
import {
  buildCustomDirectoryTargetId,
  deriveCustomDirectoryTargetName
} from "../../core/targets/target-utils.js";
import { normalizeTargetPath } from "../../core/targets/target-scanner.js";
import { createTargetRepository } from "../../db/repositories/targetRepository.js";
import { resolveDb, type DbClient, type DbProvider } from "./db-provider.js";

export type TargetsListResult = {
  registeredTargets: RegisteredTargetRecord[];
};

export type TargetsRescanResult = TargetsListResult & {
  scanIssues: TargetScanIssue[];
};

export type AddSkillDirectoryTargetInput = {
  skillUnitId: string;
  targetPath: string;
};

export type DeleteTargetsInput = {
  targetIds: string[];
};

type TargetsRescanOperations = {
  now: () => Date;
  scanRegisteredTargets: typeof scanRegisteredTargets;
  scanSystemTargets: typeof scanSystemTargets;
};
type TargetDirectorySelectionOperations = {
  showOpenDialog: typeof dialog.showOpenDialog;
};
type AddCustomDirectoryTargetOperations = {
  now: () => Date;
};

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

export const addCustomDirectoryTarget = async (
  db: DbClient,
  targetPath: string,
  operations: AddCustomDirectoryTargetOperations = {
    now: () => new Date()
  }
): Promise<TargetsListResult> => {
  const normalizedPath = normalizeTargetPath(targetPath);
  const targetRepository = createTargetRepository(db);

  await targetRepository.registerCustomDirectoryTarget(
    {
      id: buildCustomDirectoryTargetId(normalizedPath),
      name: deriveCustomDirectoryTargetName(targetPath),
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
  const targetPath = input.targetPath.trim();

  if (!skillUnitId || !targetPath) {
    throw new Error("Skill and target directory are required.");
  }

  const normalizedPath = normalizeTargetPath(targetPath);
  const targetRepository = createTargetRepository(db);

  await targetRepository.registerIndependentDirectoryTargetForSkill(
    {
      id: buildCustomDirectoryTargetId(normalizedPath),
      name: deriveCustomDirectoryTargetName(targetPath),
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

  if (!targetIds.length) {
    throw new Error("At least one target is required.");
  }

  const targetRepository = createTargetRepository(db);

  await targetRepository.deleteTargets(targetIds);

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
    "targets:addCustomDirectory",
    (_event, targetPath: string): Promise<TargetsListResult> => {
      return addCustomDirectoryTarget(resolveDb(db), targetPath);
    }
  );
  ipcMain.handle(
    "targets:addSkillDirectory",
    (_event, input: AddSkillDirectoryTargetInput): Promise<TargetsListResult> => {
      return addSkillDirectoryTarget(resolveDb(db), input);
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
