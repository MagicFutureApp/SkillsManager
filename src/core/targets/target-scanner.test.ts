import { describe, expect, it } from "vitest";

import { scanSystemTargets } from "./target-scanner";

describe("scanSystemTargets", () => {
  it("detects conventional agent target directories and CLI executables", async () => {
    const existingPaths = new Set([
      "/Users/test/.codex",
      "/Users/test/.codex/skills",
      "/Users/test/.claude",
      "/usr/local/bin/codex",
      "/opt/homebrew/bin/claude"
    ]);

    const targets = await scanSystemTargets({
      exists: async (candidatePath) => existingPaths.has(candidatePath),
      homeDir: "/Users/test",
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
        name: "Codex CLI",
        path: "/Users/test/.codex/skills",
        status: "detected",
        type: "codex-cli"
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
        status: "missing",
        type: "gemini-cli"
      }
    ]);
    expect(Object.keys(targets[0] ?? {}).sort()).toEqual([
      "defaultInstallStrategy",
      "id",
      "name",
      "normalizedPath",
      "path",
      "status",
      "type"
    ]);
  });
});
