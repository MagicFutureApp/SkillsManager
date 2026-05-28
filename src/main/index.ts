import { app, BrowserWindow, Menu, Tray } from "electron";
import path from "node:path";
import { registerHealthIpc } from "./ipc/health";
import { getAppLocale, registerLocaleIpc } from "./ipc/locale.js";
import { getMainMessages } from "./i18n/main-messages.js";
import { getTrayIconPath } from "./tray-icon.js";
import { buildMainWindowOptions, disableWindowMenuBar } from "./window-menu.js";
import { APP_META } from "../core/app-constants.js";

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;

const loadMainWindow = async (window: BrowserWindow): Promise<void> => {
  const devServerUrl = process.env.VITE_DEV_SERVER_URL;

  if (devServerUrl) {
    await window.loadURL(devServerUrl);
    return;
  }

  await window.loadFile(path.join(__dirname, "../renderer/index.html"));
};

const createMainWindow = async (): Promise<void> => {
  mainWindow = new BrowserWindow(buildMainWindowOptions(__dirname));
  disableWindowMenuBar(mainWindow);

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  await loadMainWindow(mainWindow);
};

const createTray = (): void => {
  const messages = getMainMessages(getAppLocale());

  tray = new Tray(getTrayIconPath(__dirname));
  tray.setToolTip(APP_META.title);
  tray.setContextMenu(
    Menu.buildFromTemplate([
      {
        label: messages.tray.show,
        click: () => {
          if (mainWindow) {
            mainWindow.show();
            mainWindow.focus();
          } else {
            void createMainWindow().catch((error: unknown) => {
              console.error("Failed to create main window from tray menu.", error);
            });
          }
        }
      },
      { type: "separator" },
      {
        label: messages.tray.quit,
        click: () => {
          app.quit();
        }
      }
    ])
  );

  tray.on("click", () => {
    if (!mainWindow) {
      void createMainWindow().catch((error: unknown) => {
        console.error("Failed to create main window from tray click.", error);
      });
      return;
    }

    if (mainWindow.isVisible()) {
      mainWindow.hide();
      return;
    }

    mainWindow.show();
    mainWindow.focus();
  });
};

void app
  .whenReady()
  .then(async () => {
    registerHealthIpc();
    registerLocaleIpc();
    await createMainWindow();
    createTray();

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        void createMainWindow().catch((error: unknown) => {
          console.error("Failed to create main window on activate.", error);
        });
      }
    });
  })
  .catch((error: unknown) => {
    console.error("Failed to start Skillport.", error);
  });

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
