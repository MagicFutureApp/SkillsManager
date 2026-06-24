import { ipcMain } from "electron";

import type { RegisteredTargetRecord } from "../../core/targets/target-api.js";
import { scanSystemTargets } from "../../core/targets/target-scanner.js";
import { createTargetRepository } from "../../db/repositories/targetRepository.js";
import { resolveDb, type DbClient, type DbProvider } from "./db-provider.js";

export type TargetsListResult = {
  registeredTargets: RegisteredTargetRecord[];
};

export type TargetsRescanResult = TargetsListResult;

type TargetsRescanOperations = {
  now: () => Date;
  scanSystemTargets: typeof scanSystemTargets;
};

export const getTargets = async (db: DbClient): Promise<TargetsListResult> => {
  const targetRepository = createTargetRepository(db);

  return {
    registeredTargets: await targetRepository.list()
  };
};

export const rescanTargets = async (
  db: DbClient,
  operations: TargetsRescanOperations = {
    now: () => new Date(),
    scanSystemTargets
  }
): Promise<TargetsRescanResult> => {
  const targetRepository = createTargetRepository(db);
  const scannedTargets = await operations.scanSystemTargets();

  await targetRepository.saveScannedTargets(scannedTargets, operations.now());

  return {
    registeredTargets: await targetRepository.list()
  };
};

export const registerTargetsIpc = (db: DbProvider): void => {
  ipcMain.handle("targets:list", (): Promise<TargetsListResult> => {
    return getTargets(resolveDb(db));
  });
  ipcMain.handle("targets:rescan", (): Promise<TargetsRescanResult> => {
    return rescanTargets(resolveDb(db));
  });
};
