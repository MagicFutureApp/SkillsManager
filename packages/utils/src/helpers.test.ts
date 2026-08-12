import { describe, expect, it } from "vitest";

import { asString } from "./as-string";
import { clamp } from "./clamp";
import { isRecord } from "./is-record";
import { isValidEmail } from "./is-valid-email";
import { isNewerVersion, parseVersionSegments } from "./version";
import { isValidSearchOwner, normalizeSearchQuery, SEARCH_DEFAULT_LIMIT } from "./search";

describe("clamp", () => {
  it("constrains within range", () => {
    expect(clamp(5, 1, 10)).toBe(5);
    expect(clamp(-3, 1, 10)).toBe(1);
    expect(clamp(99, 1, 10)).toBe(10);
  });
});

describe("isRecord", () => {
  it("accepts plain objects", () => {
    expect(isRecord({})).toBe(true);
    expect(isRecord({ a: 1 })).toBe(true);
  });

  it("rejects null, arrays and primitives", () => {
    expect(isRecord(null)).toBe(false);
    expect(isRecord([])).toBe(false);
    expect(isRecord("x")).toBe(false);
    expect(isRecord(1)).toBe(false);
  });
});

describe("asString", () => {
  it("trims strings", () => {
    expect(asString("  hi  ")).toBe("hi");
  });

  it("returns empty for non-strings", () => {
    expect(asString(null)).toBe("");
    expect(asString(3)).toBe("");
    expect(asString(undefined)).toBe("");
  });
});

describe("isValidEmail", () => {
  it("accepts basic emails", () => {
    expect(isValidEmail("a@b.com")).toBe(true);
  });

  it("rejects malformed input", () => {
    expect(isValidEmail("a@b")).toBe(false);
    expect(isValidEmail("ab.com")).toBe(false);
    expect(isValidEmail("a@@b.com")).toBe(false);
  });
});

describe("version comparison", () => {
  it("parses segments", () => {
    expect(parseVersionSegments("1.2.3")).toEqual([1, 2, 3]);
  });

  it("detects newer versions", () => {
    expect(isNewerVersion("1.2.3", "1.2.2")).toBe(true);
    expect(isNewerVersion("2.0.0", "1.9.9")).toBe(true);
    expect(isNewerVersion("1.2.0", "1.2.0")).toBe(false);
    expect(isNewerVersion("1.2.2", "1.2.3")).toBe(false);
    expect(isNewerVersion("garbage", "1.0.0")).toBe(false);
  });
});

describe("search helpers", () => {
  it("normalizes whitespace", () => {
    expect(normalizeSearchQuery("  react   native ")).toBe("react native");
  });

  it("validates owner segments", () => {
    expect(isValidSearchOwner("Vercel")).toBe(true);
    expect(isValidSearchOwner("foo/bar")).toBe(false);
    expect(isValidSearchOwner("")).toBe(false);
  });

  it("exposes the default limit", () => {
    expect(SEARCH_DEFAULT_LIMIT).toBe(50);
  });
});
