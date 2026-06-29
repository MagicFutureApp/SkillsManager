import { access, stat } from "node:fs/promises";
import { constants } from "node:fs";
import os from "node:os";
import path from "node:path";

import type {
  AgentTargetType,
  SystemTargetRecord,
  TargetDetectionStatus,
  TargetScanCandidate,
  TargetScanRecord
} from "./target-api";

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
  canWrite?: (candidatePath: string) => Promise<boolean>;
  exists?: (candidatePath: string) => Promise<boolean>;
  homeDir?: string;
  isDirectory?: (candidatePath: string) => Promise<boolean>;
  pathEnv?: string;
  platform?: RuntimePlatform;
};

export type ScanTargetPathOptions = {
  canWrite?: (candidatePath: string) => Promise<boolean>;
  exists?: (candidatePath: string) => Promise<boolean>;
  isDirectory?: (candidatePath: string) => Promise<boolean>;
};

export const scanSystemTargets = async ({
  canWrite = pathCanWrite,
  exists = pathExists,
  homeDir = os.homedir(),
  isDirectory = pathIsDirectory,
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
      const appInstalled = Boolean(detectedCommandPath) || directoryExists;
      const scannedTarget = await scanSystemTargetPath(
        {
          defaultInstallStrategy: "copy",
          id: definition.id,
          name: definition.name,
          normalizedPath: normalizeTargetPath(targetPath),
          path: targetPath,
          type: definition.type
        },
        definition.directory(homeDir),
        { canWrite, exists, isDirectory }
      );

      return {
        ...scannedTarget,
        status: appInstalled ? scannedTarget.status : "app-missing",
        detectionMessage: appInstalled
          ? scannedTarget.detectionMessage
          : "Application is not installed.",
        type: definition.type
      };
    })
  );
};

export const scanRegisteredTargets = async (
  targets: TargetScanCandidate[],
  options: ScanTargetPathOptions = {}
): Promise<TargetScanRecord[]> => {
  return Promise.all(targets.map((target) => scanTargetPath(target, options)));
};

export const scanTargetPath = async (
  target: TargetScanCandidate,
  {
    canWrite = pathCanWrite,
    exists = pathExists,
    isDirectory = pathIsDirectory
  }: ScanTargetPathOptions = {}
): Promise<TargetScanRecord> => {
  try {
    if (!(await exists(target.path))) {
      return toScannedTarget(
        target,
        "path-missing",
        "Application is installed, but the target directory does not exist."
      );
    }

    if (!(await isDirectory(target.path))) {
      return toScannedTarget(target, "not-directory", "Target path exists but is not a directory.");
    }

    if (!(await canWrite(target.path))) {
      return toScannedTarget(
        target,
        "not-writable",
        "Target directory exists but is not writable."
      );
    }

    return toScannedTarget(target, "detected", "Target directory exists and is writable.");
  } catch (error) {
    return toScannedTarget(
      target,
      "scan-error",
      error instanceof Error ? error.message : "Target scan failed."
    );
  }
};

const scanSystemTargetPath = async (
  target: TargetScanCandidate,
  agentConfigDirectory: string,
  options: Required<ScanTargetPathOptions>
): Promise<TargetScanRecord> => {
  const scannedTarget = await scanTargetPath(target, options);

  if (scannedTarget.status !== "path-missing") {
    return scannedTarget;
  }

  if (!(await options.exists(agentConfigDirectory))) {
    return scannedTarget;
  }

  if (!(await options.isDirectory(agentConfigDirectory))) {
    return scannedTarget;
  }

  if (!(await options.canWrite(agentConfigDirectory))) {
    return toScannedTarget(
      target,
      "not-writable",
      "Agent config directory exists but is not writable."
    );
  }

  return toScannedTarget(
    target,
    "detected",
    "Agent config directory exists and can contain the skills directory."
  );
};

export const normalizeTargetPath = (targetPath: string): string => {
  return path.normalize(targetPath).replace(/[\\/]+$/, "");
};

const toScannedTarget = (
  target: TargetScanCandidate,
  status: TargetDetectionStatus,
  detectionMessage: string
): TargetScanRecord => {
  return {
    ...target,
    detectionMessage,
    status
  };
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

const pathCanWrite = async (candidatePath: string): Promise<boolean> => {
  try {
    await access(candidatePath, constants.W_OK);
    return true;
  } catch {
    return false;
  }
};

const pathIsDirectory = async (candidatePath: string): Promise<boolean> => {
  try {
    const candidateStat = await stat(candidatePath);
    return candidateStat.isDirectory();
  } catch {
    return false;
  }
};
