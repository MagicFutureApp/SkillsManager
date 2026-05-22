import { contextBridge } from "electron";

contextBridge.exposeInMainWorld("skillsManager", {
  platform: process.platform
});
