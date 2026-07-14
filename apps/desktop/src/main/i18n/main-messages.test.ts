import { describe, expect, it } from "vitest";

import { getMainMessages } from "./main-messages";

describe("getMainMessages", () => {
  it("returns Chinese tray labels for zh-CN", () => {
    expect(getMainMessages("zh-CN").tray.show).toBe("显示 Skills Manager");
    expect(getMainMessages("zh-CN").tray.quit).toBe("退出");
  });

  it("returns English tray labels for en-US", () => {
    expect(getMainMessages("en-US").tray.show).toBe("Show Skills Manager");
    expect(getMainMessages("en-US").tray.quit).toBe("Quit");
  });
});
