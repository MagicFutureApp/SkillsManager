import { contextBridge, ipcRenderer } from "electron";
import type { SupportedLocale } from "../core/i18n/locale";
import type { AppInfo } from "./ipc/app-info";
import type { AppHealth } from "./ipc/health";
import type { ProvidersListResult } from "./ipc/providers";
import type { RepositoriesListResult } from "./ipc/repositories";
import type { RepositorySourceInspection } from "../core/repositories/source-inspection";
import type {
  CreateRepositoryInput,
  RepositoryApiRecord
} from "../core/repositories/repository-api";

contextBridge.exposeInMainWorld("skillsManager", {
  createRepository: (input: CreateRepositoryInput) =>
    ipcRenderer.invoke("repositories:create", input) as Promise<RepositoryApiRecord>,
  getHealth: () => ipcRenderer.invoke("app:getHealth") as Promise<AppHealth>,
  getInfo: () => ipcRenderer.invoke("app:getInfo") as Promise<AppInfo>,
  getLocale: () => ipcRenderer.invoke("app:getLocale") as Promise<SupportedLocale>,
  inspectRepositorySource: (remoteUrl: string) =>
    ipcRenderer.invoke(
      "repositories:inspectSource",
      remoteUrl
    ) as Promise<RepositorySourceInspection>,
  listProviders: () => ipcRenderer.invoke("providers:list") as Promise<ProvidersListResult>,
  listRepositories: () =>
    ipcRenderer.invoke("repositories:list") as Promise<RepositoriesListResult>,
  platform: process.platform
});
