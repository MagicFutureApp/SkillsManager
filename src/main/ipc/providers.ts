import { ipcMain } from "electron";
import { createProviderRepository } from "../../db/repositories/providerRepository.js";
import type { ProviderApiRecord } from "../../core/providers/provider-api.js";
import type { createDbClient } from "../../db/client.js";

export type ProvidersListResult = {
  providers: ProviderApiRecord[];
};

type DbClient = ReturnType<typeof createDbClient>;

export const getProviders = async (db: DbClient): Promise<ProvidersListResult> => {
  const providerRepository = createProviderRepository(db);

  return {
    providers: await providerRepository.list()
  };
};

export const registerProvidersIpc = (db: DbClient): void => {
  ipcMain.handle("providers:list", (): Promise<ProvidersListResult> => {
    return getProviders(db);
  });
};
