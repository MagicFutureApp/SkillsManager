import type { AppHealth as MainAppHealth } from "../main/ipc/health";
import type { AppInfo as MainAppInfo } from "../main/ipc/app-info";
import type {
  DistributionPreviewInput as MainDistributionPreviewInput,
  DistributionPreviewResult as MainDistributionPreviewResult
} from "../main/ipc/distribution";
import type { NavigationBadgeCountsResult as MainNavigationBadgeCountsResult } from "../main/ipc/navigation-badges";
import type { ProvidersListResult as MainProvidersListResult } from "../main/ipc/providers";
import type {
  RepositoriesListResult as MainRepositoriesListResult,
  RepositoriesSyncResult as MainRepositoriesSyncResult
} from "../main/ipc/repositories";
import type {
  AppSettingsResult as MainAppSettingsResult,
  AppStoragePathsResult as MainAppStoragePathsResult,
  ResetLocalDatabaseResult as MainResetLocalDatabaseResult
} from "../main/ipc/settings";
import type {
  SkillsListResult as MainSkillsListResult,
  UpdateSkillTargetPreferenceInput as MainUpdateSkillTargetPreferenceInput,
  UpdateSkillTargetPreferenceResult as MainUpdateSkillTargetPreferenceResult
} from "../main/ipc/skills";
import type {
  AddSkillDirectoryTargetInput as MainAddSkillDirectoryTargetInput,
  DeleteTargetsInput as MainDeleteTargetsInput,
  TargetsListResult as MainTargetsListResult,
  TargetsRescanResult as MainTargetsRescanResult
} from "../main/ipc/targets";
import type { SyncHistoryListResult as CoreSyncHistoryListResult } from "../core/repositories/sync-history-api";
import type {
  CreateRepositoryInput as CoreCreateRepositoryInput,
  DeleteRepositoryResult as CoreDeleteRepositoryResult,
  RepositoryApiRecord as CoreRepositoryApiRecord,
  RepositoryDeletePreview as CoreRepositoryDeletePreview,
  UpdateRepositoryInput as CoreUpdateRepositoryInput
} from "../core/repositories/repository-api";
import type { RepositorySourceInspection as CoreRepositorySourceInspection } from "../core/repositories/source-inspection";
import type { SupportedLocale as CoreSupportedLocale } from "../core/i18n/locale";
import type { RuntimePlatform as RendererRuntimePlatform } from "./platform-font";

export type AppHealth = MainAppHealth;
export type AppInfo = MainAppInfo;
export type DistributionPreviewInput = MainDistributionPreviewInput;
export type DistributionPreviewResult = MainDistributionPreviewResult;
export type NavigationBadgeCountsResult = MainNavigationBadgeCountsResult;
export type AppSettingsResult = MainAppSettingsResult;
export type AppStoragePathsResult = MainAppStoragePathsResult;
export type ResetLocalDatabaseResult = MainResetLocalDatabaseResult;
export type ProvidersListResult = MainProvidersListResult;
export type RepositoriesListResult = MainRepositoriesListResult;
export type RepositoriesSyncResult = MainRepositoriesSyncResult;
export type SkillsListResult = MainSkillsListResult;
export type UpdateSkillTargetPreferenceInput = MainUpdateSkillTargetPreferenceInput;
export type UpdateSkillTargetPreferenceResult = MainUpdateSkillTargetPreferenceResult;
export type AddSkillDirectoryTargetInput = MainAddSkillDirectoryTargetInput;
export type DeleteTargetsInput = MainDeleteTargetsInput;
export type TargetsListResult = MainTargetsListResult;
export type TargetsRescanResult = MainTargetsRescanResult;
export type SyncHistoryListResult = CoreSyncHistoryListResult;
export type CreateRepositoryInput = CoreCreateRepositoryInput;
export type UpdateRepositoryInput = CoreUpdateRepositoryInput;
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
      updateRepository?: (
        repositoryId: string,
        input: UpdateRepositoryInput
      ) => Promise<RepositoryApiRecord>;
      deleteRepository?: (repositoryId: string) => Promise<DeleteRepositoryResult>;
      getHealth: () => Promise<AppHealth>;
      getInfo: () => Promise<AppInfo>;
      getLocale: () => Promise<SupportedLocale>;
      getNavigationBadgeCounts?: () => Promise<NavigationBadgeCountsResult>;
      getAppStoragePaths?: () => Promise<AppStoragePathsResult>;
      getAppSettings?: () => Promise<AppSettingsResult>;
      getRepositoryDeletePreview?: (repositoryId: string) => Promise<RepositoryDeletePreview>;
      inspectRepositorySource?: (remoteUrl: string) => Promise<RepositorySourceInspection>;
      listProviders: () => Promise<ProvidersListResult>;
      previewDistributionPlan?: (
        input: DistributionPreviewInput
      ) => Promise<DistributionPreviewResult>;
      listRepositories: () => Promise<RepositoriesListResult>;
      listSkills?: () => Promise<SkillsListResult>;
      setSkillTargetPreference?: (
        input: UpdateSkillTargetPreferenceInput
      ) => Promise<UpdateSkillTargetPreferenceResult>;
      listSyncHistory?: () => Promise<SyncHistoryListResult>;
      listTargets?: () => Promise<TargetsListResult>;
      addCustomDirectoryTarget?: (targetPath: string) => Promise<TargetsListResult>;
      addSkillDirectoryTarget?: (input: AddSkillDirectoryTargetInput) => Promise<TargetsListResult>;
      deleteTargets?: (input: DeleteTargetsInput) => Promise<TargetsListResult>;
      rescanTargets?: () => Promise<TargetsRescanResult>;
      openExternalUrl?: (url: string) => Promise<void>;
      openRepositoryLocation?: (location: string) => Promise<void>;
      resetLocalDatabase?: () => Promise<ResetLocalDatabaseResult>;
      resolveRepositoryCachePath?: (cachePath: string) => Promise<string>;
      saveGitHubToken?: (token: string) => Promise<AppSettingsResult>;
      selectLocalRepositoryPath?: () => Promise<string | null>;
      selectTargetDirectory?: () => Promise<string | null>;
      syncRepositories?: (repositoryIds: string[]) => Promise<RepositoriesSyncResult>;
      platform: RuntimePlatform;
    };
  }
}

export {};
