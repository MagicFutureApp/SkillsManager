import type { SkillApiStatus } from "../../../../core/skills/skill-api";
import { type Skill, type TargetOption, adaptTargetOption } from "@/stores/skill-data";

// 与 store 共享的领域类型 / 适配器集中定义在 `@/stores/skill-data`，这里 re-export 以兼容既有导入方。
// 注：`adaptSkillRecord` 仅由 store 直接从 `@/stores/skill-data` 使用，此处不再 re-export（R6 死代码清理）。
export type { Skill, TargetOption };
export { adaptTargetOption };

export type SkillStatus = SkillApiStatus;
export type SkillRepositoryFilter = string;
export type SkillSort = "name" | "repository";

export type SkillFilterInput = {
  query: string;
  repository: SkillRepositoryFilter;
  skills: Skill[];
  sort: SkillSort;
};

export type SkillDistributionState = "no-selection" | "no-targets" | "ready";
export type SkillDistributionScope = "selected" | "single";

export const getTargetOptionsForSkill = (
  targets: TargetOption[],
  skill: Pick<Skill, "id"> | null
): TargetOption[] => {
  return targets.filter((target) => {
    if (target.scope === "global") {
      return true;
    }

    return skill ? target.skillPreferenceIds.includes(skill.id) : false;
  });
};

export const getSkillRepositoryOptions = (skills: Skill[]): SkillRepositoryFilter[] => {
  const repositories = new Set(skills.map((skill) => skill.repository).filter(Boolean));

  return ["all", ...Array.from(repositories).sort((first, second) => first.localeCompare(second))];
};

export const getSkillDistributionState = (
  skill: Pick<Skill, "targets"> | null
): SkillDistributionState => {
  if (!skill) {
    return "no-selection";
  }

  return skill.targets.length > 0 ? "ready" : "no-targets";
};

export const getSelectedSkillsDistributionState = (
  selectedSkills: Pick<Skill, "targets">[]
): SkillDistributionState => {
  if (!selectedSkills.length) {
    return "no-selection";
  }

  return selectedSkills.some((skill) => getSkillDistributionState(skill) === "ready")
    ? "ready"
    : "no-targets";
};

export const getDistributionTitleKey = (
  state: SkillDistributionState,
  scope: SkillDistributionScope
) => {
  if (state === "ready") {
    return "skills.actions.syncReady";
  }

  if (state === "no-selection") {
    return "skills.actions.syncNoSelection";
  }

  return scope === "selected"
    ? "skills.actions.syncSelectedNoTargets"
    : "skills.actions.syncNoTargets";
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
