import { describe, expect, it } from "vitest";

import { getAppInfo } from "./app-info";

describe("getAppInfo", () => {
  it("reads the application version from Electron", () => {
    expect(getAppInfo(() => "1.2.3")).toEqual({ version: "1.2.3" });
  });
});
