import type { AppHealth as MainAppHealth } from "../main/ipc/health";
import type { AppInfo as MainAppInfo } from "../main/ipc/app-info";
import type { ProvidersListResult as MainProvidersListResult } from "../main/ipc/providers";
import type {
  RepositoriesListResult as MainRepositoriesListResult,
  RepositoriesSyncResult as MainRepositoriesSyncResult
} from "../main/ipc/repositories";
import type { AppSettingsResult as MainAppSettingsResult } from "../main/ipc/settings";
import type { SkillsListResult as MainSkillsListResult } from "../main/ipc/skills";
import type {
  CreateRepositoryInput as CoreCreateRepositoryInput,
  DeleteRepositoryResult as CoreDeleteRepositoryResult,
  RepositoryApiRecord as CoreRepositoryApiRecord,
  RepositoryDeletePreview as CoreRepositoryDeletePreview
} from "../core/repositories/repository-api";
import type { RepositorySourceInspection as CoreRepositorySourceInspection } from "../core/repositories/source-inspection";
import type { SupportedLocale as CoreSupportedLocale } from "../core/i18n/locale";
import type { RuntimePlatform as RendererRuntimePlatform } from "./platform-font";

export type AppHealth = MainAppHealth;
export type AppInfo = MainAppInfo;
export type AppSettingsResult = MainAppSettingsResult;
export type ProvidersListResult = MainProvidersListResult;
export type RepositoriesListResult = MainRepositoriesListResult;
export type RepositoriesSyncResult = MainRepositoriesSyncResult;
export type SkillsListResult = MainSkillsListResult;
export type CreateRepositoryInput = CoreCreateRepositoryInput;
export type DeleteRepositoryResult = CoreDeleteRepositoryResult;
export type RepositoryApiRecord = CoreRepositoryApiRecord;
export type RepositoryDeletePreview = CoreRepositoryDeletePreview;
export type RepositorySourceInspection = CoreRepositorySourceInspection;
export type RuntimePlatform = RendererRuntimePlatform;
export type SupportedLocale = CoreSupportedLocale;

declare global {
  interface Window {
    skillsManager?: {
      clearGitHubToken?: () => Promise<AppSettingsResult>;
      createRepository?: (input: CreateRepositoryInput) => Promise<RepositoryApiRecord>;
      deleteRepository?: (repositoryId: string) => Promise<DeleteRepositoryResult>;
      getHealth: () => Promise<AppHealth>;
      getInfo: () => Promise<AppInfo>;
      getLocale: () => Promise<SupportedLocale>;
      getAppSettings?: () => Promise<AppSettingsResult>;
      getRepositoryDeletePreview?: (repositoryId: string) => Promise<RepositoryDeletePreview>;
      inspectRepositorySource?: (remoteUrl: string) => Promise<RepositorySourceInspection>;
      listProviders: () => Promise<ProvidersListResult>;
      listRepositories: () => Promise<RepositoriesListResult>;
      listSkills?: () => Promise<SkillsListResult>;
      openExternalUrl?: (url: string) => Promise<void>;
      saveGitHubToken?: (token: string) => Promise<AppSettingsResult>;
      syncRepositories?: (repositoryIds: string[]) => Promise<RepositoriesSyncResult>;
      platform: RuntimePlatform;
    };
  }
}

export {};
