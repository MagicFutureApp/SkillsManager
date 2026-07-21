import { app, ipcMain } from "electron";

import { resolveSupportedLocale, type SupportedLocale } from "../../core/i18n/locale.js";

export const getAppLocale = (readLocale: () => string = () => app.getLocale()): SupportedLocale => {
  return resolveSupportedLocale(readLocale());
};

export const registerLocaleIpc = (): void => {
  ipcMain.handle("app:getLocale", (): SupportedLocale => {
    return getAppLocale();
  });
};
