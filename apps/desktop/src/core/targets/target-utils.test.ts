import { describe, expect, it } from "vitest";

import { buildCustomDirectoryTargetId } from "./target-utils";

describe("target utils", () => {
  it("builds distinct custom directory target ids for paths with the same slug", () => {
    const firstId = buildCustomDirectoryTargetId("/Users/test/review-skills");
    const secondId = buildCustomDirectoryTargetId("/Users/test/review/skills");

    expect(firstId).toMatch(/^target-custom-users-test-review-skills-[a-f0-9]{12}$/);
    expect(secondId).toMatch(/^target-custom-users-test-review-skills-[a-f0-9]{12}$/);
    expect(firstId).not.toBe(secondId);
  });
});
