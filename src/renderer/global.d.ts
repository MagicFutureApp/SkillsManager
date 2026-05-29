import type { AppHealth as MainAppHealth } from "../main/ipc/health";
import type { AppInfo as MainAppInfo } from "../main/ipc/app-info";
import type { ProvidersListResult as MainProvidersListResult } from "../main/ipc/providers";
import type { RepositoriesListResult as MainRepositoriesListResult } from "../main/ipc/repositories";
import type { SupportedLocale as CoreSupportedLocale } from "../core/i18n/locale";

export type AppHealth = MainAppHealth;
export type AppInfo = MainAppInfo;
export type ProvidersListResult = MainProvidersListResult;
export type RepositoriesListResult = MainRepositoriesListResult;
export type SupportedLocale = CoreSupportedLocale;

declare global {
  interface Window {
    skillsManager?: {
      getHealth: () => Promise<AppHealth>;
      getInfo: () => Promise<AppInfo>;
      getLocale: () => Promise<SupportedLocale>;
      listProviders: () => Promise<ProvidersListResult>;
      listRepositories: () => Promise<RepositoriesListResult>;
    };
  }
}

export {};
