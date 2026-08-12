import { describe, expect, it } from "vitest";

import { cn } from "./cn";

describe("cn", () => {
  it("joins plain class names with a single space", () => {
    expect(cn("a", "b", "c")).toBe("a b c");
  });

  it("drops falsy values without extra spaces", () => {
    expect(cn("a", false, null, undefined, "", "b")).toBe("a b");
  });

  it("resolves conflicting Tailwind utilities with the later one winning", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
    expect(cn("text-red-500", "text-blue-600")).toBe("text-blue-600");
    // Later conflicting utility wins; unrelated utilities keep their input order,
    // so assert the resolved set rather than a brittle positional ordering.
    const merged = cn("p-4", "text-red-500", "p-2");
    expect(merged).toContain("p-2");
    expect(merged).toContain("text-red-500");
    expect(merged).not.toContain("p-4");
  });

  it("supports conditional object syntax", () => {
    expect(cn("base", { active: true, disabled: false })).toBe("base active");
  });
});
