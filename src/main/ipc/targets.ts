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
