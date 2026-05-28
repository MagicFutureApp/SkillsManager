import { describe, expect, it } from "vitest";

import {
  APP_META,
  MAIN_MINI_WIDTH,
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
      title: "Skillport",
      description: "Sync and Distribute Skills"
    });
  });
});
