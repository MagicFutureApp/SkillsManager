import { describe, expect, it } from "vitest";

import {
  buildRepositoryCachePath,
  formatRepositoryDateTime,
  normalizeDiscoveryEntries,
  normalizeRepositoryScanSummary,
  parseRepositoryScanSummaryJson,
  slugifyRepositoryName
} from "./repository-utils";

describe("repository utils", () => {
  it("normalizes names into reusable repository slugs and cache paths", () => {
    expect(slugifyRepositoryName(" Team Skills / Design Lab ")).toBe("team-skills-design-lab");
    expect(buildRepositoryCachePath(" Team Skills / Design Lab ")).toBe(
      "~/.skills-manager/cache/team-skills-design-lab"
    );
    expect(buildRepositoryCachePath("!!!")).toBe("~/.skills-manager/cache/repository");
  });

  it("normalizes discovery entries from form and persisted values", () => {
    expect(normalizeDiscoveryEntries(" skills/*/SKILL.md,\n.codex/skills/*/SKILL.md ")).toEqual([
      "skills/*/SKILL.md",
      ".codex/skills/*/SKILL.md"
    ]);
    expect(normalizeDiscoveryEntries("")).toEqual([]);
  });

  it("normalizes partial scan summaries with zero fallbacks", () => {
    expect(normalizeRepositoryScanSummary({ added: 2, warnings: 1 })).toEqual({
      added: 2,
      changed: 0,
      removed: 0,
      warnings: 1
    });
    expect(normalizeRepositoryScanSummary(null)).toEqual({
      added: 0,
      changed: 0,
      removed: 0,
      warnings: 0
    });
  });

  it("parses persisted scan summaries from sync run JSON", () => {
    expect(
      parseRepositoryScanSummaryJson(JSON.stringify({ added: 2, changed: 0, removed: 1 }))
    ).toEqual({
      added: 2,
      changed: 0,
      removed: 1,
      warnings: 0
    });
    expect(
      parseRepositoryScanSummaryJson(
        JSON.stringify({
          category: "network",
          scan: { added: 0, changed: 0, removed: 0, warnings: 1 }
        })
      )
    ).toEqual({
      added: 0,
      changed: 0,
      removed: 0,
      warnings: 1
    });
    expect(parseRepositoryScanSummaryJson("{not json")).toEqual({
      added: 0,
      changed: 0,
      removed: 0,
      warnings: 0
    });
  });

  it("formats repository dates consistently in Shanghai time", () => {
    expect(formatRepositoryDateTime("2026-06-20T01:00:00.000Z")).toBe("2026/06/20 09:00");
    expect(formatRepositoryDateTime(null)).toBe("--");
    expect(formatRepositoryDateTime("not-a-date")).toBe("--");
  });
});
