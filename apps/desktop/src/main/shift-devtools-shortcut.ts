const SHIFT_DEVTOOLS_PRESS_COUNT = 4;
const SHIFT_DEVTOOLS_RESET_MS = 300;

type DevToolsShortcutWindow = {
  webContents: {
    on: (
      eventName: "before-input-event",
      listener: (event: Electron.Event, input: Electron.Input) => void
    ) => unknown;
    openDevTools: () => void;
  };
};

export const registerShiftDevToolsShortcut = (window: DevToolsShortcutWindow): void => {
  let shiftPressCount = 0;
  let previousShiftPressAt = 0;

  window.webContents.on("before-input-event", (_event, input) => {
    if (input.type !== "keyDown" || input.isAutoRepeat) {
      return;
    }

    if (input.key !== "Shift") {
      shiftPressCount = 0;
      previousShiftPressAt = 0;
      return;
    }

    const now = Date.now();
    if (shiftPressCount > 0 && now - previousShiftPressAt > SHIFT_DEVTOOLS_RESET_MS) {
      shiftPressCount = 0;
    }

    shiftPressCount += 1;
    previousShiftPressAt = now;

    if (shiftPressCount >= SHIFT_DEVTOOLS_PRESS_COUNT) {
      window.webContents.openDevTools();
      shiftPressCount = 0;
      previousShiftPressAt = 0;
    }
  });
};
