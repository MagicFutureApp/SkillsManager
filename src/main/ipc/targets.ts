import { ipcMain } from "electron";

import type { RegisteredTargetRecord, SystemTargetRecord } from "../../core/targets/target-api.js";
import { scanSystemTargets } from "../../core/targets/target-scanner.js";
import { createTargetRepository } from "../../db/repositories/targetRepository.js";
import { resolveDb, type DbClient, type DbProvider } from "./db-provider.js";

export type TargetsListResult = {
  detectedTargets: SystemTargetRecord[];
  registeredTargets: RegisteredTargetRecord[];
};

export const getTargets = async (db: DbClient): Promise<TargetsListResult> => {
  const targetRepository = createTargetRepository(db);

  return {
    detectedTargets: await scanSystemTargets(),
    registeredTargets: await targetRepository.list()
  };
};

export const registerTargetsIpc = (db: DbProvider): void => {
  ipcMain.handle("targets:list", (): Promise<TargetsListResult> => {
    return getTargets(resolveDb(db));
  });
};
