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
        executablePath: null,
        installPath: "/Users/test/.codex",
        name: "Codex",
        path: "/Users/test/.codex/skills",
        status: "detected",
        type: "codex"
      },
      {
        executablePath: "/usr/local/bin/codex",
        installPath: "/usr/local/bin/codex",
        name: "Codex CLI",
        path: "/Users/test/.codex/skills",
        status: "detected",
        type: "codex-cli"
      },
      {
        executablePath: "/opt/homebrew/bin/claude",
        installPath: "/Users/test/.claude",
        name: "Claude Code",
        path: "/Users/test/.claude/skills",
        status: "detected",
        type: "claude-code"
      },
      {
        executablePath: null,
        installPath: null,
        name: "Gemini CLI",
        path: "/Users/test/.gemini/skills",
        status: "missing",
        type: "gemini-cli"
      }
    ]);
  });
});
