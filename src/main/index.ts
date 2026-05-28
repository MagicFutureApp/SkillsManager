import { app, BrowserWindow } from "electron";
import path from "node:path";
import { registerHealthIpc } from "./ipc/health";
import { APP_META, WINDOW_MIN_WIDTH } from "../core/app-constants.js";

const createMainWindow = (): void => {
  const mainWindow = new BrowserWindow({
    width: 1180,
    height: 760,
    minWidth: WINDOW_MIN_WIDTH,
    minHeight: 640,
    title: APP_META.title,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  const devServerUrl = process.env.VITE_DEV_SERVER_URL;

  if (devServerUrl) {
    void mainWindow.loadURL(devServerUrl);
  } else {
    void mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
  }
};

void app.whenReady().then(() => {
  registerHealthIpc();
  createMainWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
