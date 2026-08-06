import { describe, expect, it } from "vitest";
import { formatCompact } from "./discover-utils";

describe("formatCompact", () => {
  it("formats values below one thousand as-is", () => {
    expect(formatCompact(999)).toBe("999");
  });

  it("formats one thousand with a k suffix", () => {
    expect(formatCompact(1000)).toBe("1.0k");
  });

  it("formats values just below one million", () => {
    expect(formatCompact(999999)).toBe("1000.0k");
  });

  it("formats one million with an M suffix", () => {
    expect(formatCompact(1000000)).toBe("1.0M");
  });
});
