import type { AppHealth as MainAppHealth } from "../main/ipc/health";
import type { AppInfo as MainAppInfo } from "../main/ipc/app-info";
import type { ProvidersListResult as MainProvidersListResult } from "../main/ipc/providers";
import type { RepositoriesListResult as MainRepositoriesListResult } from "../main/ipc/repositories";
import type {
  CreateRepositoryInput as CoreCreateRepositoryInput,
  RepositoryApiRecord as CoreRepositoryApiRecord
} from "../core/repositories/repository-api";
import type { RepositorySourceInspection as CoreRepositorySourceInspection } from "../core/repositories/source-inspection";
import type { SupportedLocale as CoreSupportedLocale } from "../core/i18n/locale";
import type { RuntimePlatform as RendererRuntimePlatform } from "./platform-font";

export type AppHealth = MainAppHealth;
export type AppInfo = MainAppInfo;
export type ProvidersListResult = MainProvidersListResult;
export type RepositoriesListResult = MainRepositoriesListResult;
export type CreateRepositoryInput = CoreCreateRepositoryInput;
export type RepositoryApiRecord = CoreRepositoryApiRecord;
export type RepositorySourceInspection = CoreRepositorySourceInspection;
export type RuntimePlatform = RendererRuntimePlatform;
export type SupportedLocale = CoreSupportedLocale;

declare global {
  interface Window {
    skillsManager?: {
      createRepository?: (input: CreateRepositoryInput) => Promise<RepositoryApiRecord>;
      getHealth: () => Promise<AppHealth>;
      getInfo: () => Promise<AppInfo>;
      getLocale: () => Promise<SupportedLocale>;
      inspectRepositorySource?: (remoteUrl: string) => Promise<RepositorySourceInspection>;
      listProviders: () => Promise<ProvidersListResult>;
      listRepositories: () => Promise<RepositoriesListResult>;
      platform: RuntimePlatform;
    };
  }
}

export {};
