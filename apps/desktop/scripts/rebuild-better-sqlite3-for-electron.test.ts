// @vitest-environment node

import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

import {
  createElectronRebuildInvocation,
  getInstalledElectronVersion
} from "./rebuild-better-sqlite3-for-electron";

const require = createRequire(import.meta.url);

describe("rebuild better-sqlite3 for Electron", () => {
  it("reads the installed Electron runtime version", () => {
    const electronPackage = require("electron/package.json") as { version: string };

    expect(getInstalledElectronVersion()).toBe(electronPackage.version);
  });

  it("builds a desktop workspace rebuild invocation for the Electron runtime", () => {
    expect(createElectronRebuildInvocation("41.7.1", "darwin")).toEqual({
      command: "pnpm",
      args: ["rebuild", "better-sqlite3"],
      env: {
        npm_config_disturl: "https://electronjs.org/headers",
        npm_config_runtime: "electron",
        npm_config_target: "41.7.1"
      }
    });
  });

  it("uses the pnpm executable name supported by Windows", () => {
    expect(createElectronRebuildInvocation("41.7.1", "win32").command).toBe("pnpm.cmd");
  });
});
