import path from "node:path";
import { describe, expect, it } from "vitest";

import { getAppIconPath, getTrayIconPath } from "./tray-icon";

describe("app icon paths", () => {
  it("uses the same mark asset for window and tray icons", () => {
    const mainDirname = path.join("dist", "main", "main");
    const expectedIconPath = path.normalize(path.join("dist", "renderer", "skillport-mark.png"));

    expect(getAppIconPath(mainDirname)).toBe(expectedIconPath);
    expect(getTrayIconPath(mainDirname)).toBe(expectedIconPath);
  });
});
