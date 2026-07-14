import os from "node:os";
import path from "node:path";

export const expandHomePath = (value: string): string => {
  if (value === "~") {
    return os.homedir();
  }

  if (value.startsWith(`~${path.sep}`) || value.startsWith("~/")) {
    return path.join(os.homedir(), value.slice(2));
  }

  return value;
};

export const normalizeFilesystemPath = (value: string): string => {
  return path
    .resolve(value)
    .replace(/[\\/]+$/, "")
    .toLowerCase();
};

export const isSameOrChildPath = (candidate: string, parent: string): boolean => {
  const normalizedCandidate = candidate.toLowerCase();
  const normalizedParent = parent.toLowerCase();

  return (
    normalizedCandidate === normalizedParent ||
    normalizedCandidate.startsWith(`${normalizedParent}${path.sep}`)
  );
};

export const resolveSafeInstalledPath = ({
  installedPath,
  targetPath
}: {
  installedPath: string;
  targetPath: string;
}): string => {
  const resolvedInstalledPath = expandHomePath(installedPath);
  const resolvedTargetPath = expandHomePath(targetPath);
  const normalizedInstalledPath = normalizeFilesystemPath(resolvedInstalledPath);
  const normalizedTargetPath = normalizeFilesystemPath(resolvedTargetPath);

  if (
    normalizedInstalledPath === normalizedTargetPath ||
    !isSameOrChildPath(normalizedInstalledPath, normalizedTargetPath)
  ) {
    throw new Error("Installed skill path is not safe to delete.");
  }

  return resolvedInstalledPath;
};
