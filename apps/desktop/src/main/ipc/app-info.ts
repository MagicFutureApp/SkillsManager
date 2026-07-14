import { app, ipcMain } from "electron";

export type AppInfo = {
  version: string;
};

export const getAppInfo = (readVersion: () => string = () => app.getVersion()): AppInfo => {
  return {
    version: readVersion()
  };
};

export const registerAppInfoIpc = (): void => {
  ipcMain.handle("app:getInfo", (): AppInfo => {
    return getAppInfo();
  });
};
