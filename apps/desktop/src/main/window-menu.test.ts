import path from "node:path";
import { describe, expect, it, vi } from "vitest";

import { buildMainWindowOptions, disableWindowMenuBar, getMainWindowHtmlPath } from "./window-menu";

describe("main window menu bar", () => {
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
});
