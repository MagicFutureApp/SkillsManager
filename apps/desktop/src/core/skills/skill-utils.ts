export type SkillMetadataSnapshot = {
  skillKey?: unknown;
  tags?: unknown;
};

export const parseSkillMetadataSnapshot = (
  metadataSnapshotJson: string
): { skillKey: string; tags: string[] } => {
  try {
    const parsed = JSON.parse(metadataSnapshotJson) as SkillMetadataSnapshot;

    return {
      skillKey: typeof parsed.skillKey === "string" ? parsed.skillKey : "",
      tags: Array.isArray(parsed.tags)
        ? parsed.tags.filter((tag): tag is string => typeof tag === "string")
        : []
    };
  } catch {
    return { skillKey: "", tags: [] };
  }
};

export const resolveSkillKey = (metadataSnapshotJson: string, rootPath: string): string => {
  return parseSkillMetadataSnapshot(metadataSnapshotJson).skillKey || toSkillKey(rootPath);
};

export const toSkillKey = (rootPath: string): string => {
  if (rootPath === ".") {
    return "skill";
  }

  return rootPath
    .replace(/^\.+\//, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
};
