import { contextBridge, ipcRenderer } from "electron";
import type { SupportedLocale } from "../core/i18n/locale";
import type { AppInfo } from "./ipc/app-info";
import type {
  DistributionExecuteInput,
  DistributionExecuteResult,
  DistributionPreviewInput,
  DistributionPreviewResult
} from "./ipc/distribution";
import type { AppHealth } from "./ipc/health";
import type { NavigationBadgeCountsResult } from "./ipc/navigation-badges";
import type { ProvidersListResult } from "./ipc/providers";
import type {
  RepositoriesListResult,
  RepositoriesSyncProgressEvent,
  RepositoriesSyncResult
} from "./ipc/repositories";
import type {
  AppSettingsResult,
  AppStoragePathsResult,
  DistributionSettings,
  ResetLocalDatabaseResult
} from "./ipc/settings";
import type {
  SkillsListResult,
  UpdateSkillTargetPreferenceInput,
  UpdateSkillTargetPreferenceResult
} from "./ipc/skills";
import type {
  AddCustomDirectoryTargetInput,
  AddSkillDirectoryTargetInput,
  DeleteTargetsInput,
  SelectedTargetDirectoryResolution,
  UpdateCustomDirectoryTargetInput,
  TargetsListResult,
  TargetsRescanResult
} from "./ipc/targets";
import type { RepositorySourceInspection } from "../core/repositories/source-inspection";
import type {
  CreateRepositoryInput,
  DeleteRepositoryResult,
  RepositoryApiRecord,
  RepositoryDeletePreview,
  UpdateRepositoryInput
} from "../core/repositories/repository-api";

contextBridge.exposeInMainWorld("skillsManager", {
  clearGitHubToken: () =>
    ipcRenderer.invoke("settings:clearGitHubToken") as Promise<AppSettingsResult>,
  createRepository: (input: CreateRepositoryInput) =>
    ipcRenderer.invoke("repositories:create", input) as Promise<RepositoryApiRecord>,
  updateRepository: (repositoryId: string, input: UpdateRepositoryInput) =>
    ipcRenderer.invoke("repositories:update", repositoryId, input) as Promise<RepositoryApiRecord>,
  deleteRepository: (repositoryId: string) =>
    ipcRenderer.invoke("repositories:delete", repositoryId) as Promise<DeleteRepositoryResult>,
  getHealth: () => ipcRenderer.invoke("app:getHealth") as Promise<AppHealth>,
  getInfo: () => ipcRenderer.invoke("app:getInfo") as Promise<AppInfo>,
  getLocale: () => ipcRenderer.invoke("app:getLocale") as Promise<SupportedLocale>,
  getNavigationBadgeCounts: () =>
    ipcRenderer.invoke("navigation:getBadgeCounts") as Promise<NavigationBadgeCountsResult>,
  getAppStoragePaths: () =>
    ipcRenderer.invoke("settings:getStoragePaths") as Promise<AppStoragePathsResult>,
  getAppSettings: () => ipcRenderer.invoke("settings:get") as Promise<AppSettingsResult>,
  getRepositoryDeletePreview: (repositoryId: string) =>
    ipcRenderer.invoke(
      "repositories:getDeletePreview",
      repositoryId
    ) as Promise<RepositoryDeletePreview>,
  inspectRepositorySource: (remoteUrl: string) =>
    ipcRenderer.invoke(
      "repositories:inspectSource",
      remoteUrl
    ) as Promise<RepositorySourceInspection>,
  listProviders: () => ipcRenderer.invoke("providers:list") as Promise<ProvidersListResult>,
  previewDistribution: (input: DistributionPreviewInput) =>
    ipcRenderer.invoke("distribution:preview", input) as Promise<DistributionPreviewResult>,
  executeDistribution: (input: DistributionExecuteInput) =>
    ipcRenderer.invoke("distribution:execute", input) as Promise<DistributionExecuteResult>,
  listRepositories: () =>
    ipcRenderer.invoke("repositories:list") as Promise<RepositoriesListResult>,
  listSkills: () => ipcRenderer.invoke("skills:list") as Promise<SkillsListResult>,
  setSkillTargetPreference: (input: UpdateSkillTargetPreferenceInput) =>
    ipcRenderer.invoke(
      "skills:setTargetPreference",
      input
    ) as Promise<UpdateSkillTargetPreferenceResult>,
  listTargets: () => ipcRenderer.invoke("targets:list") as Promise<TargetsListResult>,
  addCustomDirectoryTarget: (input: AddCustomDirectoryTargetInput) =>
    ipcRenderer.invoke("targets:addCustomDirectory", input) as Promise<TargetsListResult>,
  addSkillDirectoryTarget: (input: AddSkillDirectoryTargetInput) =>
    ipcRenderer.invoke("targets:addSkillDirectory", input) as Promise<TargetsListResult>,
  updateCustomDirectoryTarget: (input: UpdateCustomDirectoryTargetInput) =>
    ipcRenderer.invoke("targets:updateCustomDirectory", input) as Promise<TargetsListResult>,
  deleteTargets: (input: DeleteTargetsInput) =>
    ipcRenderer.invoke("targets:delete", input) as Promise<TargetsListResult>,
  rescanTargets: () => ipcRenderer.invoke("targets:rescan") as Promise<TargetsRescanResult>,
  openExternalUrl: (url: string) =>
    ipcRenderer.invoke("settings:openExternalUrl", url) as Promise<void>,
  openRepositoryLocation: (location: string) =>
    ipcRenderer.invoke("repositories:openLocation", location) as Promise<void>,
  resetLocalDatabase: () =>
    ipcRenderer.invoke("settings:resetLocalDatabase") as Promise<ResetLocalDatabaseResult>,
  resolveRepositoryCachePath: (cachePath: string) =>
    ipcRenderer.invoke("repositories:resolveCachePath", cachePath) as Promise<string>,
  saveGitHubToken: (token: string) =>
    ipcRenderer.invoke("settings:saveGitHubToken", token) as Promise<AppSettingsResult>,
  updateDistributionSettings: (settings: Partial<DistributionSettings>) =>
    ipcRenderer.invoke(
      "settings:updateDistributionSettings",
      settings
    ) as Promise<AppSettingsResult>,
  selectLocalRepositoryPath: () =>
    ipcRenderer.invoke("repositories:selectLocalPath") as Promise<string | null>,
  selectTargetDirectory: () =>
    ipcRenderer.invoke("targets:selectDirectory") as Promise<string | null>,
  resolveSelectedTargetDirectory: (selectedPath: string) =>
    ipcRenderer.invoke(
      "targets:resolveSelectedDirectory",
      selectedPath
    ) as Promise<SelectedTargetDirectoryResolution>,
  onRepositorySyncProgress: (callback: (event: RepositoriesSyncProgressEvent) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, progress: RepositoriesSyncProgressEvent) =>
      callback(progress);

    ipcRenderer.on("repositories:syncProgress", listener);

    return () => ipcRenderer.removeListener("repositories:syncProgress", listener);
  },
  syncRepositories: (repositoryIds: string[]) =>
    ipcRenderer.invoke("repositories:sync", repositoryIds) as Promise<RepositoriesSyncResult>,
  platform: process.platform
});
