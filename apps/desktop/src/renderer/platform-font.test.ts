import { describe, expect, it } from "vitest";

import { applyPlatformFont, resolveFontPlatform } from "./platform-font";

describe("platform font selection", () => {
  it("resolves win32 to the Windows font platform", () => {
    expect(resolveFontPlatform("win32")).toBe("windows");
  });

  it("resolves darwin to the macOS font platform", () => {
    expect(resolveFontPlatform("darwin")).toBe("macos");
  });

  it("resolves linux to the Linux font platform", () => {
    expect(resolveFontPlatform("linux")).toBe("linux");
  });

  it("applies the resolved platform to the document root", () => {
    const root = document.createElement("html");

    applyPlatformFont(root, "win32");

    expect(root.dataset.platform).toBe("windows");
  });
});
