import { app, BrowserWindow, Menu, screen, Tray } from "electron";
import { createAppDbRuntime, type AppDbRuntime } from "./app-storage";
import { registerAppInfoIpc } from "./ipc/app-info";
import { registerDistributionIpc } from "./ipc/distribution";
import { registerHealthIpc } from "./ipc/health";
import { getAppLocale, registerLocaleIpc } from "./ipc/locale";
import { registerNavigationBadgesIpc } from "./ipc/navigation-badges";
import { registerProvidersIpc } from "./ipc/providers";
import { registerReleaseIpc } from "./ipc/release";
import { registerRepositoriesIpc } from "./ipc/repositories";
import { registerSettingsIpc } from "./ipc/settings";
import { registerSkillsIpc } from "./ipc/skills";
import { registerTargetsIpc } from "./ipc/targets";
import { registerCatalogIpc } from "./ipc/catalog";
import { getMainMessages } from "./i18n/main-messages";
import { registerShiftDevToolsShortcut } from "./shift-devtools-shortcut";
import { createTrayIconImage } from "./tray-icon";
import {
  loadMainWindowState,
  resolveMainWindowPlacement,
  saveMainWindowState
} from "./window-state";
import {
  buildMainWindowOptions,
  denyExternalWindowOpen,
  disableWindowMenuBar,
  getMainWindowHtmlPath
} from "./window-menu";
import { APP_META } from "../core/app-constants";
import { createRepositoryRepository } from "../db/repositories/repositoryRepository";

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let dbRuntime: AppDbRuntime | null = null;

const loadMainWindow = async (window: BrowserWindow): Promise<void> => {
  const devServerUrl = process.env.VITE_DEV_SERVER_URL;

  if (devServerUrl) {
    await window.loadURL(devServerUrl);
    return;
  }

  await window.loadFile(getMainWindowHtmlPath(import.meta.dirname));
};

const createMainWindow = async (): Promise<void> => {
  const fallbackDisplay = screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
  const savedState = dbRuntime ? await loadMainWindowState(dbRuntime.getDb()) : null;
  const placement = resolveMainWindowPlacement({
    displays: screen.getAllDisplays(),
    fallbackDisplay,
    savedState
  });

  mainWindow = new BrowserWindow({
    ...buildMainWindowOptions(import.meta.dirname),
    ...placement.bounds
  });
  disableWindowMenuBar(mainWindow);
  denyExternalWindowOpen(mainWindow);
  registerShiftDevToolsShortcut(mainWindow);
  registerMainWindowStatePersistence(mainWindow);

  if (placement.isMaximized) {
    mainWindow.maximize();
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  await loadMainWindow(mainWindow);
};

const registerMainWindowStatePersistence = (window: BrowserWindow): void => {
  let saveTimer: ReturnType<typeof setTimeout> | null = null;

  const persistWindowState = (): void => {
    if (saveTimer) {
      clearTimeout(saveTimer);
      saveTimer = null;
    }

    if (window.isDestroyed() || window.isMinimized() || !dbRuntime) {
      return;
    }

    const bounds = window.getNormalBounds();
    const display = screen.getDisplayMatching(bounds);

    void saveMainWindowState(dbRuntime.getDb(), {
      displayId: display.id,
      bounds,
      isMaximized: window.isMaximized()
    }).catch((error: unknown) => {
      console.error("Failed to save main window state.", error);
    });
  };

  const scheduleWindowStateSave = (): void => {
    if (saveTimer) {
      clearTimeout(saveTimer);
    }

    saveTimer = setTimeout(persistWindowState, 250);
  };

  window.on("move", scheduleWindowStateSave);
  window.on("resize", scheduleWindowStateSave);
  window.on("maximize", scheduleWindowStateSave);
  window.on("unmaximize", scheduleWindowStateSave);
  window.on("close", persistWindowState);
  window.on("closed", () => {
    if (saveTimer) {
      clearTimeout(saveTimer);
      saveTimer = null;
    }
  });
};

const createTray = (): void => {
  const messages = getMainMessages(getAppLocale());

  tray = new Tray(createTrayIconImage(import.meta.dirname));
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
    dbRuntime = createAppDbRuntime({
      dataDirectory: app.getPath("userData")
    });

    try {
      await createRepositoryRepository(dbRuntime.getDb()).markInterruptedSyncRuns();
    } catch (error: unknown) {
      console.error("Failed to recover interrupted repository sync runs.", error);
    }

    registerAppInfoIpc();
    registerDistributionIpc(dbRuntime.getDb);
    registerHealthIpc();
    registerLocaleIpc();
    registerNavigationBadgesIpc(dbRuntime.getDb);
    registerProvidersIpc(dbRuntime.getDb);
    registerReleaseIpc();
    registerRepositoriesIpc(dbRuntime.getDb);
    registerSettingsIpc(dbRuntime);
    registerSkillsIpc(dbRuntime.getDb);
    registerTargetsIpc(dbRuntime.getDb);
    registerCatalogIpc();
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
    console.error("Failed to start Skills Manager.", error);
  });

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("will-quit", () => {
  dbRuntime?.close();
  dbRuntime = null;
});
