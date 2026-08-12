import path from "node:path";
import { describe, expect, it, vi } from "vitest";

import {
  buildMainWindowOptions,
  denyExternalWindowOpen,
  disableWindowMenuBar,
  getMainWindowHtmlPath
} from "./window-menu";

describe("main window menu bar", () => {
  it("leaves the initial size to the resolved window placement", () => {
    const options = buildMainWindowOptions("dist/main/main");

    expect(options).not.toHaveProperty("width");
    expect(options).not.toHaveProperty("height");
  });

  it("creates the main window with the menu bar hidden", () => {
    expect(buildMainWindowOptions("dist/main/main")).toMatchObject({
      autoHideMenuBar: true
    });
  });

  it("aligns the window controls overlay with the custom title bar height", () => {
    expect(buildMainWindowOptions("dist/main/main")).toMatchObject({
      titleBarStyle: "hidden",
      titleBarOverlay: {
        color: "rgba(255, 255, 255, 0)",
        symbolColor: "#172033",
        height: 44
      }
    });
  });

  it("points the preload at the ESM bundle", () => {
    // 全仓 ESM：preload 源是 src/main/preload.mts，编译产物为 dist/main/main/preload.mjs（ESM）。
    // 关键：Electron 的 preload 会忽略 package.json 的 "type": "module"，只认扩展名，
    // 所以 ESM preload 必须是 .mjs；若改回 .js/.cjs 或误开 sandbox，启动会被当作 CJS 解析而抛 SyntaxError。
    const options = buildMainWindowOptions(path.join("dist", "main", "main"));

    expect(options.webPreferences?.preload).toBe(path.join("dist", "main", "main", "preload.mjs"));
    expect(options.webPreferences?.sandbox).toBe(false);
  });

  it("resolves the packaged renderer entry from the compiled main directory", () => {
    expect(getMainWindowHtmlPath(path.join("dist", "main", "main"))).toBe(
      path.normalize(path.join("dist", "renderer", "index.html"))
    );
  });

  it("removes the menu from an existing browser window", () => {
    const window = {
      setMenu: vi.fn(),
      setMenuBarVisibility: vi.fn()
    };

    disableWindowMenuBar(window);

    expect(window.setMenu).toHaveBeenCalledWith(null);
    expect(window.setMenuBarVisibility).toHaveBeenCalledWith(false);
  });

  it("denies all new windows opened from the renderer", () => {
    const setWindowOpenHandler = vi.fn();
    const target = { webContents: { setWindowOpenHandler } };

    denyExternalWindowOpen(target);

    expect(setWindowOpenHandler).toHaveBeenCalledTimes(1);
    const handler = setWindowOpenHandler.mock.calls[0]?.[0] as () => { action: "deny" };
    expect(handler()).toEqual({ action: "deny" });
  });
});
