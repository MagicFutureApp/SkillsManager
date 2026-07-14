import { createHash } from "node:crypto";
import path from "node:path";

export const buildCustomDirectoryTargetId = (normalizedPath: string): string => {
  const slug = slugifyTargetPath(normalizedPath) || "directory";
  const digest = createHash("sha256").update(normalizedPath).digest("hex").slice(0, 12);

  return `target-custom-${slug}-${digest}`;
};

export const deriveCustomDirectoryTargetName = (targetPath: string): string => {
  return path.basename(path.resolve(targetPath)) || targetPath;
};

export const slugifyTargetPath = (value: string): string => {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
};
