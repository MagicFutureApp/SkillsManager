import { describe, expect, it } from "vitest";

import { toErrorMessage } from "./errors";

describe("toErrorMessage", () => {
  it("returns Error messages", () => {
    expect(toErrorMessage(new Error("Something failed."))).toBe("Something failed.");
  });

  it("returns an empty string for unknown thrown values", () => {
    expect(toErrorMessage("Something failed.")).toBe("");
    expect(toErrorMessage(null)).toBe("");
  });
});
