import { describe, expect, it } from "vitest";

import { getAppLocale } from "./locale";

describe("getAppLocale", () => {
  it("normalizes the Electron application locale", () => {
    expect(getAppLocale(() => "en-GB")).toBe("en-US");
    expect(getAppLocale(() => "zh-Hans-CN")).toBe("zh-CN");
  });
});
