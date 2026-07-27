import { describe, expect, it, vi } from "vitest";

import {
  MAIN_WINDOW_STATE_SETTING_KEY,
  loadMainWindowState,
  parseMainWindowState,
  resolveMainWindowPlacement,
  saveMainWindowState,
  type WindowDisplay
} from "./window-state";

const appSettings = vi.hoisted(() => ({
  get: vi.fn(),
  set: vi.fn()
}));

vi.mock("../db/repositories/appSettingsRepository", () => ({
  createAppSettingsRepository: () => appSettings
}));

const primaryDisplay: WindowDisplay = {
  id: 1,
  workArea: { x: 0, y: 0, width: 1920, height: 1040 }
};

const secondaryDisplay: WindowDisplay = {
  id: 2,
  workArea: { x: -1600, y: 0, width: 1600, height: 900 }
};

describe("main window state", () => {
  it("persists and reloads the last window state", async () => {
    const state = {
      displayId: 2,
      bounds: { x: -1500, y: 40, width: 1200, height: 760 },
      isMaximized: true
    };
    appSettings.set.mockResolvedValue(undefined);
    appSettings.get.mockResolvedValue({ valueJson: JSON.stringify(state) });

    await saveMainWindowState({} as never, state);

    expect(appSettings.set).toHaveBeenCalledWith(MAIN_WINDOW_STATE_SETTING_KEY, state);
    await expect(loadMainWindowState({} as never)).resolves.toEqual(state);
    expect(appSettings.get).toHaveBeenCalledWith(MAIN_WINDOW_STATE_SETTING_KEY);
  });

  it("opens at 80 percent of the cursor display on first launch", () => {
    expect(
      resolveMainWindowPlacement({
        displays: [primaryDisplay, secondaryDisplay],
        fallbackDisplay: secondaryDisplay,
        savedState: null
      })
    ).toEqual({
      bounds: { x: -1440, y: 90, width: 1280, height: 720 },
      isMaximized: false
    });
  });

  it("restores the saved bounds on the previously used display", () => {
    expect(
      resolveMainWindowPlacement({
        displays: [primaryDisplay, secondaryDisplay],
        fallbackDisplay: primaryDisplay,
        savedState: {
          displayId: 2,
          bounds: { x: -1500, y: 40, width: 1200, height: 760 },
          isMaximized: true
        }
      })
    ).toEqual({
      bounds: { x: -1500, y: 40, width: 1200, height: 760 },
      isMaximized: true
    });
  });

  it("keeps restored bounds inside the available work area", () => {
    expect(
      resolveMainWindowPlacement({
        displays: [primaryDisplay],
        fallbackDisplay: primaryDisplay,
        savedState: {
          displayId: 1,
          bounds: { x: 1700, y: 900, width: 1400, height: 900 },
          isMaximized: false
        }
      })
    ).toEqual({
      bounds: { x: 520, y: 140, width: 1400, height: 900 },
      isMaximized: false
    });
  });

  it("falls back to the cursor display when the saved display was removed", () => {
    expect(
      resolveMainWindowPlacement({
        displays: [primaryDisplay],
        fallbackDisplay: primaryDisplay,
        savedState: {
          displayId: 2,
          bounds: { x: -1500, y: 40, width: 1200, height: 760 },
          isMaximized: false
        }
      })
    ).toEqual({
      bounds: { x: 192, y: 104, width: 1536, height: 832 },
      isMaximized: false
    });
  });

  it("ignores malformed persisted state", () => {
    expect(parseMainWindowState("not-json")).toBeNull();
    expect(
      parseMainWindowState(
        JSON.stringify({
          displayId: 1,
          bounds: { x: 0, y: 0, width: -1, height: 760 },
          isMaximized: false
        })
      )
    ).toBeNull();
  });
});
