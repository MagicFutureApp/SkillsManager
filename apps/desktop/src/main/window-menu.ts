import type { BrowserWindow, BrowserWindowConstructorOptions } from "electron";
import path from "node:path";

import { APP_META, WINDOW_MIN_HEIGHT, WINDOW_MIN_WIDTH } from "../core/app-constants";
import { getAppIconPath } from "./tray-icon";

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
    // 全仓 ESM：preload 源是 src/main/preload.mts，编译产物 dist/main/main/preload.mjs（ESM）。
    // 关键：Electron 的 preload 会忽略 package.json 的 "type": "module"，只认扩展名，
    // 所以 ESM preload 必须是 .mjs 后缀，否则会被当成 CJS 解析而启动崩溃（SyntaxError）。
    // 又因 Electron 的 sandboxed preload 不支持 ESM，这里显式 sandbox: false 才能加载 ESM preload。
    // 代价：主窗口渲染进程不走 OS 级沙箱；但 contextIsolation 仍为 true、nodeIntegration 仍为 false，
    // 渲染进程依旧无法直接访问 Node/fs，只能通过暴露的 IPC 桥与 main 通信。
    sandbox: false,
    preload: path.join(mainDirname, "preload.mjs"),
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
