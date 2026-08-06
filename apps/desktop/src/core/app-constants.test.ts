import { describe, expect, it } from "vitest";

import {
  APP_META,
  CATALOG_BASE_URL,
  MAIN_MINI_WIDTH,
  resolveCatalogBaseUrl,
  SIDEBAR_AUTO_COLLAPSE_WIDTH,
  SIDEBAR_COLLAPSE_WIDTH,
  SIDEBAR_EXPAND_WIDTH,
  WINDOW_MIN_WIDTH
} from "./app-constants";

describe("app constants", () => {
  it("keeps shell and window widths derived from one source", () => {
    expect(SIDEBAR_AUTO_COLLAPSE_WIDTH).toBe(MAIN_MINI_WIDTH + SIDEBAR_EXPAND_WIDTH);
    expect(WINDOW_MIN_WIDTH).toBe(MAIN_MINI_WIDTH + SIDEBAR_COLLAPSE_WIDTH + 16);
  });

  it("defines shared app metadata", () => {
    expect(APP_META).toEqual({
      title: "Skills Manager",
      description: "Sync and Distribute Skills"
    });
  });
});

describe("resolveCatalogBaseUrl", () => {
  it("falls back to the bundled catalog base URL", () => {
    expect(resolveCatalogBaseUrl({})).toBe(CATALOG_BASE_URL);
  });

  it("prefers the environment override", () => {
    expect(
      resolveCatalogBaseUrl({ SKILLS_MANAGER_CATALOG_BASE_URL: "https://catalog.example.dev" })
    ).toBe("https://catalog.example.dev");
  });

  it("trims whitespace and trailing slashes", () => {
    expect(
      resolveCatalogBaseUrl({ SKILLS_MANAGER_CATALOG_BASE_URL: "  https://catalog.example.dev//  " })
    ).toBe("https://catalog.example.dev");
  });

  it("returns an empty string for a blank override so the client reports a config failure", () => {
    expect(resolveCatalogBaseUrl({ SKILLS_MANAGER_CATALOG_BASE_URL: "   " })).toBe("");
  });
});
