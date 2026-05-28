import { describe, expect, it } from "vitest";

import { defaultLocale, resolveSupportedLocale, supportedLocales } from "./locale";

describe("resolveSupportedLocale", () => {
  it("keeps exact supported locales", () => {
    expect(resolveSupportedLocale("zh-CN")).toBe("zh-CN");
    expect(resolveSupportedLocale("en-US")).toBe("en-US");
  });

  it("normalizes common locale variants", () => {
    expect(resolveSupportedLocale("zh")).toBe("zh-CN");
    expect(resolveSupportedLocale("zh-Hans-CN")).toBe("zh-CN");
    expect(resolveSupportedLocale("en")).toBe("en-US");
    expect(resolveSupportedLocale("en-GB")).toBe("en-US");
  });

  it("falls back to the default locale for unsupported or empty values", () => {
    expect(resolveSupportedLocale("ja-JP")).toBe(defaultLocale);
    expect(resolveSupportedLocale("")).toBe(defaultLocale);
    expect(supportedLocales).toEqual(["zh-CN", "en-US"]);
  });
});
