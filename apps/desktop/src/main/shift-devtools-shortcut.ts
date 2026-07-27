import { createShiftPressSequenceHandler } from "../core/keyboard/shift-press-sequence.js";

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
  const handleShiftPress = createShiftPressSequenceHandler(() => {
    window.webContents.openDevTools();
  });

  window.webContents.on("before-input-event", (_event, input) => {
    if (input.type !== "keyDown") {
      return;
    }

    handleShiftPress({ key: input.key, isAutoRepeat: input.isAutoRepeat });
  });
};
