import { app, BrowserWindow } from "electron";
import path from "node:path";

const createMainWindow = (): void => {
  const mainWindow = new BrowserWindow({
    width: 1180,
    height: 760,
    minWidth: 960,
    minHeight: 640,
    title: "Skills Manager",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  const html = `
    <!doctype html>
    <html lang="zh-CN">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Skills Manager</title>
        <style>
          body {
            margin: 0;
            min-height: 100vh;
            display: grid;
            place-items: center;
            font-family: Arial, "Microsoft YaHei", sans-serif;
            color: #172033;
            background: #f5f7fb;
          }

          main {
            text-align: center;
          }

          h1 {
            margin: 0 0 12px;
            font-size: 32px;
            font-weight: 700;
          }

          p {
            margin: 0;
            color: #5c667a;
            font-size: 15px;
          }
        </style>
      </head>
      <body>
        <main>
          <h1>Skills Manager</h1>
          <p>Electron shell initialized. React renderer comes next.</p>
          <p>
              We are using Node.js <span id="node-version"></span>,
              Chromium <span id="chrome-version"></span>,
              and Electron <span id="electron-version"></span>.
          </p>
        </main>
      </body>
    </html>
  `;

  void mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
};

void app.whenReady().then(() => {
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
