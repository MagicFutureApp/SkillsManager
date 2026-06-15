import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { scanSkillDirectory } from "./skill-scanner";

describe("scanSkillDirectory", () => {
  it("discovers nested SKILL.md files with stable metadata", async () => {
    const rootPath = await mkdtemp(path.join(os.tmpdir(), "skills-manager-scan-"));

    await mkdir(path.join(rootPath, "skills", "review-bot"), { recursive: true });
    await mkdir(path.join(rootPath, ".codex", "skills", "release-notes"), { recursive: true });
    await writeFile(
      path.join(rootPath, "skills", "review-bot", "SKILL.md"),
      "# Review Bot\n\nReviews pull requests with concise, actionable feedback.\n",
      "utf8"
    );
    await writeFile(
      path.join(rootPath, ".codex", "skills", "release-notes", "SKILL.md"),
      "# Release Notes\n\nTurns commit history into readable release notes.\n",
      "utf8"
    );

    await expect(scanSkillDirectory(rootPath)).resolves.toEqual([
      {
        description: "Turns commit history into readable release notes.",
        discoveryMethod: "convention",
        entryPath: ".codex/skills/release-notes/SKILL.md",
        name: "Release Notes",
        rootPath: ".codex/skills/release-notes",
        skillKey: "codex-skills-release-notes",
        status: "ready",
        tags: []
      },
      {
        description: "Reviews pull requests with concise, actionable feedback.",
        discoveryMethod: "convention",
        entryPath: "skills/review-bot/SKILL.md",
        name: "Review Bot",
        rootPath: "skills/review-bot",
        skillKey: "skills-review-bot",
        status: "ready",
        tags: []
      }
    ]);
  });
});
