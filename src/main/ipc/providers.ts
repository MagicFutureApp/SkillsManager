import { ipcMain } from "electron";
import { createProviderRepository } from "../../db/repositories/providerRepository.js";
import type { ProviderApiRecord } from "../../core/providers/provider-api.js";
import { resolveDb, type DbClient, type DbProvider } from "./db-provider.js";

export type ProvidersListResult = {
  providers: ProviderApiRecord[];
};

export const getProviders = async (db: DbClient): Promise<ProvidersListResult> => {
  const providerRepository = createProviderRepository(db);

  return {
    providers: await providerRepository.list()
  };
};

export const registerProvidersIpc = (db: DbProvider): void => {
  ipcMain.handle("providers:list", (): Promise<ProvidersListResult> => {
    return getProviders(resolveDb(db));
  });
};
