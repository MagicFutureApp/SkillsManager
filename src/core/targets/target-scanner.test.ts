import { describe, expect, it } from "vitest";

import { scanSystemTargets } from "./target-scanner";

describe("scanSystemTargets", () => {
  it("detects conventional agent target directories and CLI executables", async () => {
    const existingPaths = new Set([
      "/Users/test/.codex",
      "/Users/test/.codex/skills",
      "/Users/test/.claude",
      "/Users/test/.claude/skills",
      "/usr/local/bin/codex",
      "/opt/homebrew/bin/claude"
    ]);

    const targets = await scanSystemTargets({
      canWrite: async (candidatePath) => candidatePath !== "/Users/test/.gemini/skills",
      exists: async (candidatePath) => existingPaths.has(candidatePath),
      homeDir: "/Users/test",
      isDirectory: async (candidatePath) => existingPaths.has(candidatePath),
      pathEnv: "/usr/local/bin:/opt/homebrew/bin",
      platform: "darwin"
    });

    expect(targets).toMatchObject([
      {
        name: "Codex",
        path: "/Users/test/.codex/skills",
        status: "detected",
        type: "codex"
      },
      {
        name: "Claude Code",
        path: "/Users/test/.claude/skills",
        status: "detected",
        type: "claude-code"
      },
      {
        name: "Gemini CLI",
        path: "/Users/test/.gemini/skills",
        status: "app-missing",
        type: "gemini-cli"
      }
    ]);
    expect(Object.keys(targets[0] ?? {}).sort()).toEqual([
      "defaultInstallStrategy",
      "detectionMessage",
      "id",
      "name",
      "normalizedPath",
      "path",
      "status",
      "type"
    ]);
  });

  it("checks app installation before directory existence and write access", async () => {
    const existingPaths = new Set([
      "/Users/test/.codex",
      "/Users/test/.codex/skills",
      "/Users/test/.claude",
      "/Users/test/.claude/skills",
      "/usr/local/bin/codex",
      "/usr/local/bin/claude",
      "/usr/local/bin/gemini"
    ]);

    const targets = await scanSystemTargets({
      canWrite: async (candidatePath) => candidatePath !== "/Users/test/.claude/skills",
      exists: async (candidatePath) => existingPaths.has(candidatePath),
      homeDir: "/Users/test",
      isDirectory: async (candidatePath) => existingPaths.has(candidatePath),
      pathEnv: "/usr/local/bin",
      platform: "darwin"
    });

    expect(targets).toMatchObject([
      {
        detectionMessage: "Target directory exists and is writable.",
        name: "Codex",
        path: "/Users/test/.codex/skills",
        status: "detected"
      },
      {
        detectionMessage: "Target directory exists but is not writable.",
        name: "Claude Code",
        path: "/Users/test/.claude/skills",
        status: "not-writable"
      },
      {
        detectionMessage: "Application is installed, but the target directory does not exist.",
        name: "Gemini CLI",
        path: "/Users/test/.gemini/skills",
        status: "path-missing"
      }
    ]);
  });
});
