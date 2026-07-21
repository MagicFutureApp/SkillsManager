import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { minimatch } from "minimatch";

import { toSkillKey } from "./skill-utils";

export type DiscoveredSkill = {
  description: string;
  discoveryMethod: "convention";
  entryPath: string;
  license: string;
  name: string;
  rootPath: string;
  skillKey: string;
  status: "ready";
  tags: string[];
};

const ignoredSkillScanDirectoryNames = new Set([
  ".bundle",
  ".build",
  ".cargo",
  ".dart_tool",
  ".gradle",
  ".kotlin",
  ".konan",
  ".m2",
  ".nuget",
  ".pub-cache",
  ".stack-work",
  ".terraform",
  ".terragrunt-cache",
  ".tox",
  ".venv",
  "__pycache__",
  "__pypackages__",
  "bower_components",
  "carthage",
  "dist-packages",
  "env",
  "jspm_packages",
  "node_modules",
  "pods",
  "site-packages",
  "target",
  "vendor",
  "venv"
]);

export const scanSkillDirectory = async (
  rootPath: string,
  discoveryEntries: string[] = []
): Promise<DiscoveredSkill[]> => {
  const skillEntries = filterSkillEntries(
    await findSkillEntries(rootPath, rootPath),
    normalizeDiscoveryEntries(discoveryEntries)
  );

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
        license: metadata.license,
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
      if (isIgnoredSkillScanDirectory(entry.name)) {
        continue;
      }

      skillEntries.push(...(await findSkillEntries(rootPath, absolutePath)));
      continue;
    }

    if (entry.isFile() && entry.name === "SKILL.md") {
      skillEntries.push(toPosixPath(path.relative(rootPath, absolutePath)));
    }
  }

  return skillEntries;
};

const isIgnoredSkillScanDirectory = (directoryName: string): boolean => {
  return ignoredSkillScanDirectoryNames.has(directoryName.toLowerCase());
};

const normalizeDiscoveryEntries = (entries: string[]): string[] => {
  return entries
    .map((entry) => toPosixPath(entry).trim().replace(/^\.\//, ""))
    .filter((entry) => entry.endsWith("SKILL.md"));
};

const filterSkillEntries = (skillEntries: string[], discoveryEntries: string[]): string[] => {
  if (!discoveryEntries.length) {
    return skillEntries;
  }

  return skillEntries.filter((entryPath) =>
    discoveryEntries.some((discoveryEntry) => matchesDiscoveryEntry(entryPath, discoveryEntry))
  );
};

const matchesDiscoveryEntry = (entryPath: string, discoveryEntry: string): boolean => {
  return minimatch(entryPath, discoveryEntry, { dot: true });
};

const parseSkillMarkdown = (
  markdown: string,
  rootPath: string
): { description: string; license: string; name: string } => {
  const lines = markdown.split(/\r?\n/);
  const frontmatter = parseFrontmatter(lines);
  const markdownLines = frontmatter.bodyLines;
  const heading = markdownLines.find((line) => line.trim().startsWith("# "));
  const description = markdownLines.find((line) => {
    const trimmedLine = line.trim();
    return trimmedLine && !trimmedLine.startsWith("#");
  });

  return {
    description: frontmatter.description || description?.trim() || "",
    license: frontmatter.license,
    name:
      frontmatter.name || heading?.replace(/^#\s+/, "").trim() || titleize(path.basename(rootPath))
  };
};

const parseFrontmatter = (
  lines: string[]
): { bodyLines: string[]; description: string; license: string; name: string } => {
  if (lines[0]?.trim() !== "---") {
    return { bodyLines: lines, description: "", license: "", name: "" };
  }

  const endIndex = lines.findIndex((line, index) => index > 0 && line.trim() === "---");

  if (endIndex === -1) {
    return { bodyLines: lines, description: "", license: "", name: "" };
  }

  const metadata = new Map<string, string>();

  lines.slice(1, endIndex).forEach((line) => {
    const separatorIndex = line.indexOf(":");

    if (separatorIndex === -1) {
      return;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();

    if (key) {
      metadata.set(key, unquoteYamlScalar(value));
    }
  });

  return {
    bodyLines: lines.slice(endIndex + 1),
    description: metadata.get("description") ?? "",
    license: metadata.get("license") ?? "",
    name: metadata.get("name") ?? ""
  };
};

const unquoteYamlScalar = (value: string): string => {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
};

const titleize = (value: string): string => {
  const words = value.split(/[-_\s]+/).filter(Boolean);

  if (!words.length) {
    return "Skill";
  }

  return words.map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`).join(" ");
};

const toPosixPath = (value: string): string => {
  return value.split(path.sep).join("/");
};
