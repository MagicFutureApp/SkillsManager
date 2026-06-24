import { access } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import type { AgentTargetType, SystemTargetRecord } from "./target-api";

type RuntimePlatform = NodeJS.Platform;

type TargetDefinition = {
  command?: string;
  directory: (homeDir: string) => string;
  id: string;
  name: string;
  path: (homeDir: string) => string;
  type: AgentTargetType;
};

export type ScanSystemTargetsOptions = {
  exists?: (candidatePath: string) => Promise<boolean>;
  homeDir?: string;
  pathEnv?: string;
  platform?: RuntimePlatform;
};

export const scanSystemTargets = async ({
  exists = pathExists,
  homeDir = os.homedir(),
  pathEnv = process.env.PATH ?? "",
  platform = process.platform
}: ScanSystemTargetsOptions = {}): Promise<SystemTargetRecord[]> => {
  const pathEntries = splitPathEnv(pathEnv, platform);

  return Promise.all(
    targetDefinitions.map(async (definition) => {
      const targetPath = definition.path(homeDir);
      const detectedCommandPath = definition.command
        ? await findExecutablePath(definition.command, pathEntries, exists, platform)
        : null;
      const directoryExists = await exists(definition.directory(homeDir));
      const targetPathExists = await exists(targetPath);
      const detected = Boolean(detectedCommandPath) || directoryExists || targetPathExists;

      return {
        defaultInstallStrategy: "copy",
        id: definition.id,
        name: definition.name,
        normalizedPath: normalizeTargetPath(targetPath),
        path: targetPath,
        status: detected ? "detected" : "missing",
        type: definition.type
      };
    })
  );
};

export const normalizeTargetPath = (targetPath: string): string => {
  return path.normalize(targetPath).replace(/[\\/]+$/, "");
};

const targetDefinitions: TargetDefinition[] = [
  {
    command: "codex",
    directory: (homeDir) => path.join(homeDir, ".codex"),
    id: "system-codex",
    name: "Codex",
    path: (homeDir) => path.join(homeDir, ".codex", "skills"),
    type: "codex"
  },
  {
    command: "claude",
    directory: (homeDir) => path.join(homeDir, ".claude"),
    id: "system-claude-code",
    name: "Claude Code",
    path: (homeDir) => path.join(homeDir, ".claude", "skills"),
    type: "claude-code"
  },
  {
    command: "gemini",
    directory: (homeDir) => path.join(homeDir, ".gemini"),
    id: "system-gemini-cli",
    name: "Gemini CLI",
    path: (homeDir) => path.join(homeDir, ".gemini", "skills"),
    type: "gemini-cli"
  }
];

const splitPathEnv = (pathEnv: string, platform: RuntimePlatform): string[] => {
  const delimiter = platform === "win32" ? ";" : ":";

  return pathEnv
    .split(delimiter)
    .map((entry) => entry.trim())
    .filter(Boolean);
};

const findExecutablePath = async (
  command: string,
  pathEntries: string[],
  exists: (candidatePath: string) => Promise<boolean>,
  platform: RuntimePlatform
): Promise<string | null> => {
  const commandNames =
    platform === "win32" ? [command, `${command}.cmd`, `${command}.exe`] : [command];

  for (const pathEntry of pathEntries) {
    for (const commandName of commandNames) {
      const candidatePath = path.join(pathEntry, commandName);

      if (await exists(candidatePath)) {
        return candidatePath;
      }
    }
  }

  return null;
};

const pathExists = async (candidatePath: string): Promise<boolean> => {
  try {
    await access(candidatePath);
    return true;
  } catch {
    return false;
  }
};
