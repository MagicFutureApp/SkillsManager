export type SkillStatus = "ready" | "review" | "installed";

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

export const skills: Skill[] = [
  {
    id: "prompt-engineering-basic",
    skillId: "prompt-engineering/basic",
    name: "Prompt Engineering Basic",
    repository: "Team skills repository",
    version: "0.1.0",
    entry: "skills/prompt-engineering/basic/SKILL.md",
    description: "基础提示词工程模式，适合写作、评审和结构化任务拆解。",
    status: "installed",
    enabled: true,
    targets: ["codex", "claude"],
    tags: ["prompt", "writing"]
  },
  {
    id: "browser-qa",
    skillId: "testing/browser-qa",
    name: "Browser QA checklist",
    repository: "Team skills repository",
    version: "0.3.2",
    entry: "skills/testing/browser-qa/SKILL.md",
    description: "用于本地预览、截图验证、键盘路径和可访问性烟测。",
    status: "ready",
    enabled: true,
    targets: ["codex"],
    tags: ["testing", "browser"]
  },
  {
    id: "wireframe-review",
    skillId: "design/wireframe-review",
    name: "详情",
    repository: "Design lab prompts",
    version: "0.2.0",
    entry: "skills/design/wireframe-review/SKILL.md",
    description: "对低保真产品界面做层级、密度、术语和流程检查。",
    status: "review",
    enabled: true,
    targets: ["codex", "custom"],
    tags: ["design", "review"]
  },
  {
    id: "local-refactor-notes",
    skillId: "engineering/refactor-notes",
    name: "Refactor notes",
    repository: "Local development skills",
    version: "local",
    entry: "agents/skills/refactor-notes/SKILL.md",
    description: "整理代码重构前后的行为边界、验证步骤和残留风险。",
    status: "ready",
    enabled: false,
    targets: ["gemini"],
    tags: ["engineering", "notes"]
  }
];

export const selectedSkill = skills[0];
