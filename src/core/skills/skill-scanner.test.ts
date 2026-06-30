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
        license: "",
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
        license: "",
        name: "Review Bot",
        rootPath: "skills/review-bot",
        skillKey: "skills-review-bot",
        status: "ready",
        tags: []
      }
    ]);
  });

  it("ignores SKILL.md files under node_modules while scanning local project roots", async () => {
    const rootPath = await mkdtemp(path.join(os.tmpdir(), "skills-manager-scan-node-modules-"));

    await mkdir(path.join(rootPath, ".agents", "skills", "kanji-helper"), { recursive: true });
    await mkdir(path.join(rootPath, "node_modules", "package-with-skill"), { recursive: true });
    await writeFile(
      path.join(rootPath, ".agents", "skills", "kanji-helper", "SKILL.md"),
      "# Kanji Helper\n\nPractices kanji.\n",
      "utf8"
    );
    await writeFile(
      path.join(rootPath, "node_modules", "package-with-skill", "SKILL.md"),
      "# Package Skill\n\nShould not be parsed from dependencies.\n",
      "utf8"
    );

    await expect(scanSkillDirectory(rootPath)).resolves.toMatchObject([
      {
        entryPath: ".agents/skills/kanji-helper/SKILL.md",
        name: "Kanji Helper"
      }
    ]);
  });

  it("uses SKILL.md frontmatter name and description as skill metadata", async () => {
    const rootPath = await mkdtemp(path.join(os.tmpdir(), "skills-manager-scan-frontmatter-"));

    await mkdir(path.join(rootPath, "skills", "xlsx"), { recursive: true });
    await writeFile(
      path.join(rootPath, "skills", "xlsx", "SKILL.md"),
      [
        "---",
        "name: xlsx",
        'description: "Use this skill any time a spreadsheet file is the primary input or output."',
        "license: Proprietary. LICENSE.txt has complete terms",
        "---",
        "",
        "# Fallback Heading",
        "",
        "Fallback body description."
      ].join("\n"),
      "utf8"
    );

    await expect(scanSkillDirectory(rootPath, ["skills/*/SKILL.md"])).resolves.toMatchObject([
      {
        description: "Use this skill any time a spreadsheet file is the primary input or output.",
        entryPath: "skills/xlsx/SKILL.md",
        license: "Proprietary. LICENSE.txt has complete terms",
        name: "xlsx"
      }
    ]);
  });

  it("expands one-level discovery globs into multiple skills", async () => {
    const rootPath = await mkdtemp(path.join(os.tmpdir(), "skills-manager-scan-glob-"));

    await mkdir(path.join(rootPath, "skills", "review-bot"), { recursive: true });
    await mkdir(path.join(rootPath, "skills", "release-notes"), { recursive: true });
    await mkdir(path.join(rootPath, "docs", "ignored"), { recursive: true });
    await writeFile(
      path.join(rootPath, "skills", "review-bot", "SKILL.md"),
      "# Review Bot\n\nReviews pull requests.\n",
      "utf8"
    );
    await writeFile(
      path.join(rootPath, "skills", "release-notes", "SKILL.md"),
      "# Release Notes\n\nWrites release notes.\n",
      "utf8"
    );
    await writeFile(
      path.join(rootPath, "docs", "ignored", "SKILL.md"),
      "# Ignored\n\nOutside the configured discovery entry.\n",
      "utf8"
    );

    await expect(scanSkillDirectory(rootPath, ["skills/*/SKILL.md"])).resolves.toMatchObject([
      {
        entryPath: "skills/release-notes/SKILL.md",
        name: "Release Notes"
      },
      {
        entryPath: "skills/review-bot/SKILL.md",
        name: "Review Bot"
      }
    ]);
  });

  it("matches recursive glob discovery entries", async () => {
    const rootPath = await mkdtemp(path.join(os.tmpdir(), "skills-manager-scan-recursive-glob-"));

    await mkdir(path.join(rootPath, "root-child"), { recursive: true });
    await mkdir(path.join(rootPath, "skills", "xlsx"), { recursive: true });
    await mkdir(path.join(rootPath, "packs", "office", "word"), { recursive: true });
    await writeFile(path.join(rootPath, "SKILL.md"), "# Root\n\nRoot skill.\n", "utf8");
    await writeFile(
      path.join(rootPath, "root-child", "SKILL.md"),
      "# Root Child\n\nOne level skill.\n",
      "utf8"
    );
    await writeFile(
      path.join(rootPath, "skills", "xlsx", "SKILL.md"),
      "# XLSX\n\nSpreadsheet skill.\n",
      "utf8"
    );
    await writeFile(
      path.join(rootPath, "packs", "office", "word", "SKILL.md"),
      "# Word\n\nDocument skill.\n",
      "utf8"
    );

    await expect(scanSkillDirectory(rootPath, ["**/SKILL.md"])).resolves.toMatchObject([
      { entryPath: "SKILL.md", name: "Root" },
      { entryPath: "packs/office/word/SKILL.md", name: "Word" },
      { entryPath: "root-child/SKILL.md", name: "Root Child" },
      { entryPath: "skills/xlsx/SKILL.md", name: "XLSX" }
    ]);
  });

  it("matches mixed exact and glob discovery entries", async () => {
    const rootPath = await mkdtemp(path.join(os.tmpdir(), "skills-manager-scan-mixed-glob-"));

    await mkdir(path.join(rootPath, "template"), { recursive: true });
    await mkdir(path.join(rootPath, "skills", "pdf"), { recursive: true });
    await mkdir(path.join(rootPath, "skills", "xlsx"), { recursive: true });
    await mkdir(path.join(rootPath, "examples", "ignored"), { recursive: true });
    await writeFile(
      path.join(rootPath, "template", "SKILL.md"),
      "# Template\n\nStarter.\n",
      "utf8"
    );
    await writeFile(
      path.join(rootPath, "skills", "pdf", "SKILL.md"),
      "# PDF\n\nPDF skill.\n",
      "utf8"
    );
    await writeFile(
      path.join(rootPath, "skills", "xlsx", "SKILL.md"),
      "# XLSX\n\nSpreadsheet skill.\n",
      "utf8"
    );
    await writeFile(
      path.join(rootPath, "examples", "ignored", "SKILL.md"),
      "# Ignored\n\nIgnored skill.\n",
      "utf8"
    );

    await expect(
      scanSkillDirectory(rootPath, ["skills/*/SKILL.md", "template/SKILL.md"])
    ).resolves.toMatchObject([
      { entryPath: "skills/pdf/SKILL.md", name: "PDF" },
      { entryPath: "skills/xlsx/SKILL.md", name: "XLSX" },
      { entryPath: "template/SKILL.md", name: "Template" }
    ]);
  });

  it("uses an exact SKILL.md discovery entry for a single root skill", async () => {
    const rootPath = await mkdtemp(path.join(os.tmpdir(), "skills-manager-scan-root-"));

    await mkdir(path.join(rootPath, "skills", "ignored"), { recursive: true });
    await writeFile(
      path.join(rootPath, "SKILL.md"),
      "# Root Skill\n\nA single-skill repository.\n",
      "utf8"
    );
    await writeFile(
      path.join(rootPath, "skills", "ignored", "SKILL.md"),
      "# Ignored\n\nOutside the exact root entry.\n",
      "utf8"
    );

    await expect(scanSkillDirectory(rootPath, ["SKILL.md"])).resolves.toMatchObject([
      {
        entryPath: "SKILL.md",
        name: "Root Skill",
        rootPath: ".",
        skillKey: "skill"
      }
    ]);
  });
});
