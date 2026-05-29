import { ipcMain } from "electron";
import { defaultProviderApiRecords } from "../../core/providers/provider-api.js";
import type { ProviderApiRecord } from "../../core/providers/provider-api.js";

export type ProvidersListResult = {
  providers: ProviderApiRecord[];
};

export const getProviders = (): ProvidersListResult => {
  return {
    providers: defaultProviderApiRecords
  };
};

export const registerProvidersIpc = (): void => {
  ipcMain.handle("providers:list", (): ProvidersListResult => {
    return getProviders();
  });
};
