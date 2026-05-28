import type { BrowserWindow, BrowserWindowConstructorOptions } from "electron";
import path from "node:path";

import { APP_META, WINDOW_MIN_WIDTH } from "../core/app-constants.js";
import { getAppIconPath } from "./tray-icon.js";

export const buildMainWindowOptions = (mainDirname: string): BrowserWindowConstructorOptions => ({
  width: 1180,
  height: 760,
  minWidth: WINDOW_MIN_WIDTH,
  minHeight: 640,
  title: APP_META.title,
  icon: getAppIconPath(mainDirname),
  autoHideMenuBar: true,
  titleBarStyle: "hidden",
  titleBarOverlay: {
    color: "rgba(255, 255, 255, 0)",
    symbolColor: "#172033",
    height: 44
  },
  webPreferences: {
    preload: path.join(mainDirname, "preload.js"),
    contextIsolation: true,
    nodeIntegration: false
  }
});

export const disableWindowMenuBar = (
  window: Pick<BrowserWindow, "setMenu" | "setMenuBarVisibility">
): void => {
  window.setMenu(null);
  window.setMenuBarVisibility(false);
};
