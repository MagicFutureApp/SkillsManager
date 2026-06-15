import type { SkillApiRecord, SkillApiStatus } from "../../../../core/skills/skill-api";

export type SkillStatus = SkillApiStatus;

export type Skill = {
  id: string;
  skillId: string;
  name: string;
  repository: string;
  version: string;
  entry: string;
  description: string;
  status: SkillStatus;
  enabled: boolean;
  targets: string[];
  tags: string[];
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
    enabled: record.enabled,
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
