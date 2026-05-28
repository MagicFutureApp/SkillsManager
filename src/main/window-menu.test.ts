import { describe, expect, it, vi } from "vitest";

import { buildMainWindowOptions, disableWindowMenuBar } from "./window-menu";

describe("main window menu bar", () => {
  it("creates the main window with the menu bar hidden", () => {
    expect(buildMainWindowOptions("dist/main/main")).toMatchObject({
      autoHideMenuBar: true
    });
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
