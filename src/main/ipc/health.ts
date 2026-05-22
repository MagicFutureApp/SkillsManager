import { ipcMain } from "electron";

export type AppHealth = {
  node: string;
  chrome: string;
  electron: string;
  platform: NodeJS.Platform;
};

export const registerHealthIpc = (): void => {
  ipcMain.handle("app:getHealth", (): AppHealth => {
    return {
      node: process.versions.node,
      chrome: process.versions.chrome,
      electron: process.versions.electron,
      platform: process.platform
    };
  });
};
