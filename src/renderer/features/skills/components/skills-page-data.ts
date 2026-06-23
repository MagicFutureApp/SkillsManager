import type { SkillApiRecord, SkillApiStatus } from "../../../../core/skills/skill-api";

export type SkillStatus = SkillApiStatus;
export type SkillRepositoryFilter = string;
export type SkillSort = "name" | "repository";

export type Skill = {
  id: string;
  skillId: string;
  name: string;
  repository: string;
  version: string;
  entry: string;
  description: string;
  status: SkillStatus;
  targets: string[];
  tags: string[];
};

export type SkillFilterInput = {
  query: string;
  repository: SkillRepositoryFilter;
  skills: Skill[];
  sort: SkillSort;
};

export type TargetOption = {
  id: string;
  name: string;
  path: string;
};

export const targetOptions: TargetOption[] = [
  { id: "codex", name: "Codex", path: "~/.codex/skills" },
  { id: "claude", name: "Claude Code", path: "~/.claude/skills" },
  { id: "gemini", name: "Gemini CLI", path: "~/.gemini/skills" },
  { id: "custom", name: "skills.targets.customDirectory", path: "D:/Agents/shared-skills" }
];

export const adaptSkillRecord = (record: SkillApiRecord): Skill => {
  return {
    description: record.description,
    entry: record.entry,
    id: record.id,
    name: record.name,
    repository: record.repository,
    skillId: record.skillId,
    status: record.status,
    tags: record.tags,
    targets: record.targets,
    version: record.version
  };
};

export const getSkillRepositoryOptions = (skills: Skill[]): SkillRepositoryFilter[] => {
  const repositories = new Set(skills.map((skill) => skill.repository).filter(Boolean));

  return ["all", ...Array.from(repositories).sort((first, second) => first.localeCompare(second))];
};

export const filterSkills = ({ query, repository, skills, sort }: SkillFilterInput): Skill[] => {
  const normalizedQuery = query.trim().toLowerCase();
  const visible = skills.filter((skill) => {
    const searchable = [skill.name, skill.repository, skill.description].join(" ").toLowerCase();

    return (
      (!normalizedQuery || searchable.includes(normalizedQuery)) &&
      (repository === "all" || skill.repository === repository)
    );
  });

  return [...visible].sort((first, second) => {
    if (sort === "name") {
      return first.name.localeCompare(second.name);
    }

    if (sort === "repository") {
      return (
        first.repository.localeCompare(second.repository) || first.name.localeCompare(second.name)
      );
    }

    return first.name.localeCompare(second.name);
  });
};
