import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const desktopRoot = fileURLToPath(new URL("..", import.meta.url));

type ElectronPackage = {
  version?: unknown;
};

type ElectronRebuildInvocation = {
  command: string;
  args: string[];
  env: Record<string, string>;
};

export const getInstalledElectronVersion = () => {
  const electronPackage = require("electron/package.json") as ElectronPackage;

  if (typeof electronPackage.version !== "string" || !electronPackage.version) {
    throw new Error("Unable to read the installed Electron version.");
  }

  return electronPackage.version;
};

export const createElectronRebuildInvocation = (
  electronVersion: string,
  platform: NodeJS.Platform = process.platform
): ElectronRebuildInvocation => ({
  command: platform === "win32" ? "pnpm.cmd" : "pnpm",
  args: ["rebuild", "better-sqlite3"],
  env: {
    npm_config_disturl: "https://electronjs.org/headers",
    npm_config_runtime: "electron",
    npm_config_target: electronVersion
  }
});

export const rebuildBetterSqlite3ForElectron = () => {
  const electronVersion = getInstalledElectronVersion();
  const invocation = createElectronRebuildInvocation(electronVersion);

  console.log(`Rebuilding better-sqlite3 for Electron ${electronVersion}...`);

  const result = spawnSync(invocation.command, invocation.args, {
    cwd: desktopRoot,
    env: { ...process.env, ...invocation.env },
    stdio: "inherit"
  });

  if (result.error) {
    throw result.error;
  }

  return result.status ?? 1;
};

const entryPoint = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : "";

if (import.meta.url === entryPoint) {
  process.exitCode = rebuildBetterSqlite3ForElectron();
}
