import { contextBridge, ipcRenderer } from "electron";
import type { AppHealth } from "./ipc/health";

contextBridge.exposeInMainWorld("skillsManager", {
  getHealth: () => ipcRenderer.invoke("app:getHealth") as Promise<AppHealth>
});
