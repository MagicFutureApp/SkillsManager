import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

export type DiscoveredSkill = {
  description: string;
  discoveryMethod: "convention";
  entryPath: string;
  name: string;
  rootPath: string;
  skillKey: string;
  status: "ready";
  tags: string[];
};

export const scanSkillDirectory = async (rootPath: string): Promise<DiscoveredSkill[]> => {
  const skillEntries = await findSkillEntries(rootPath, rootPath);

  return Promise.all(
    skillEntries.sort().map(async (entryPath) => {
      const absoluteEntryPath = path.join(rootPath, entryPath);
      const rootPathRelative = toPosixPath(path.dirname(entryPath));
      const markdown = await readFile(absoluteEntryPath, "utf8");
      const metadata = parseSkillMarkdown(markdown, rootPathRelative);

      return {
        description: metadata.description,
        discoveryMethod: "convention",
        entryPath,
        name: metadata.name,
        rootPath: rootPathRelative,
        skillKey: toSkillKey(rootPathRelative),
        status: "ready",
        tags: []
      };
    })
  );
};

const findSkillEntries = async (rootPath: string, currentPath: string): Promise<string[]> => {
  const entries = await readdir(currentPath, { withFileTypes: true });
  const skillEntries: string[] = [];

  for (const entry of entries) {
    const absolutePath = path.join(currentPath, entry.name);

    if (entry.isDirectory()) {
      skillEntries.push(...(await findSkillEntries(rootPath, absolutePath)));
      continue;
    }

    if (entry.isFile() && entry.name === "SKILL.md") {
      skillEntries.push(toPosixPath(path.relative(rootPath, absolutePath)));
    }
  }

  return skillEntries;
};

const parseSkillMarkdown = (
  markdown: string,
  rootPath: string
): { description: string; name: string } => {
  const lines = markdown.split(/\r?\n/);
  const heading = lines.find((line) => line.trim().startsWith("# "));
  const description = lines.find((line) => {
    const trimmedLine = line.trim();
    return trimmedLine && !trimmedLine.startsWith("#");
  });

  return {
    description: description?.trim() ?? "",
    name: heading?.replace(/^#\s+/, "").trim() || titleize(path.basename(rootPath))
  };
};

const titleize = (value: string): string => {
  const words = value.split(/[-_\s]+/).filter(Boolean);

  if (!words.length) {
    return "Skill";
  }

  return words.map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`).join(" ");
};

const toSkillKey = (rootPath: string): string => {
  return rootPath
    .replace(/^\.+\//, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
};

const toPosixPath = (value: string): string => {
  return value.split(path.sep).join("/");
};
