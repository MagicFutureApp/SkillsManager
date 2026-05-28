import { contextBridge, ipcRenderer } from "electron";
import type { SupportedLocale } from "../core/i18n/locale";
import type { AppHealth } from "./ipc/health";

contextBridge.exposeInMainWorld("skillsManager", {
  getHealth: () => ipcRenderer.invoke("app:getHealth") as Promise<AppHealth>,
  getLocale: () => ipcRenderer.invoke("app:getLocale") as Promise<SupportedLocale>
});
