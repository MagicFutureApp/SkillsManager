import { describe, expect, it } from "vitest";

import { asString, isValidEmail } from "./utils";

describe("asString", () => {
  it("trims surrounding whitespace", () => {
    expect(asString("  hi  ")).toBe("hi");
  });

  it("returns empty string for non-string inputs", () => {
    expect(asString(42)).toBe("");
    expect(asString(undefined)).toBe("");
    expect(asString(null)).toBe("");
    expect(asString({})).toBe("");
  });
});

describe("isValidEmail", () => {
  it("accepts common email shapes", () => {
    expect(isValidEmail("a@b.com")).toBe(true);
    expect(isValidEmail("user.name+tag@sub.example.co")).toBe(true);
  });

  it("rejects malformed emails", () => {
    expect(isValidEmail("ab.com")).toBe(false);
    expect(isValidEmail("a @b.com")).toBe(false);
    expect(isValidEmail("a@b")).toBe(false);
    expect(isValidEmail("")).toBe(false);
  });
});
