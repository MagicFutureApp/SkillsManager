import type { BrowserWindow, BrowserWindowConstructorOptions } from "electron";
import path from "node:path";

import { APP_META, WINDOW_MIN_HEIGHT, WINDOW_MIN_WIDTH } from "../core/app-constants.js";
import { getAppIconPath } from "./tray-icon.js";

export const getMainWindowHtmlPath = (mainDirname: string): string =>
  path.join(mainDirname, "..", "..", "renderer", "index.html");

export const buildMainWindowOptions = (mainDirname: string): BrowserWindowConstructorOptions => ({
  minWidth: WINDOW_MIN_WIDTH,
  minHeight: WINDOW_MIN_HEIGHT,
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

type WindowOpenHandlerTarget = {
  webContents: { setWindowOpenHandler: (handler: () => { action: "deny" }) => void };
};

/** 拒绝渲染进程发起的一切新窗口；外链必须显式走 settings:openExternalUrl 白名单。 */
export const denyExternalWindowOpen = (target: WindowOpenHandlerTarget): void => {
  target.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
};
