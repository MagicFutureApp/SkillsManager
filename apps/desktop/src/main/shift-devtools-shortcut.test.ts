import { afterEach, describe, expect, it, vi } from "vitest";

import { registerShiftDevToolsShortcut } from "./shift-devtools-shortcut";

type BeforeInputListener = (event: Electron.Event, input: Electron.Input) => void;

const createWindowWithInputListener = () => {
  let beforeInputListener: BeforeInputListener | null = null;
  const window = {
    webContents: {
      on: vi.fn((eventName: string, listener: BeforeInputListener) => {
        if (eventName === "before-input-event") {
          beforeInputListener = listener;
        }
      }),
      openDevTools: vi.fn()
    }
  };

  registerShiftDevToolsShortcut(window);

  const sendKeyDown = (key: string): void => {
    if (!beforeInputListener) {
      throw new Error("before-input-event listener was not registered.");
    }

    beforeInputListener({} as Electron.Event, { key, type: "keyDown" } as Electron.Input);
  };

  return { sendKeyDown, window };
};

describe("Shift developer tools shortcut", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("opens developer tools after four consecutive Shift key presses", () => {
    const { sendKeyDown, window } = createWindowWithInputListener();

    for (let press = 0; press < 3; press += 1) {
      sendKeyDown("Shift");
    }

    expect(window.webContents.openDevTools).not.toHaveBeenCalled();

    sendKeyDown("Shift");

    expect(window.webContents.openDevTools).toHaveBeenCalledTimes(1);
  });

  it("resets the Shift sequence when two presses are more than 300ms apart", () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    const { sendKeyDown, window } = createWindowWithInputListener();

    for (let press = 0; press < 3; press += 1) {
      vi.setSystemTime(press * 300);
      sendKeyDown("Shift");
    }

    vi.setSystemTime(901);
    sendKeyDown("Shift");

    expect(window.webContents.openDevTools).not.toHaveBeenCalled();

    for (let press = 0; press < 3; press += 1) {
      vi.setSystemTime(901 + (press + 1) * 300);
      sendKeyDown("Shift");
    }

    expect(window.webContents.openDevTools).toHaveBeenCalledTimes(1);
  });

  it("resets the Shift sequence when another key is pressed", () => {
    const { sendKeyDown, window } = createWindowWithInputListener();

    for (let press = 0; press < 3; press += 1) {
      sendKeyDown("Shift");
    }

    sendKeyDown("A");
    sendKeyDown("Shift");

    expect(window.webContents.openDevTools).not.toHaveBeenCalled();
  });
});
