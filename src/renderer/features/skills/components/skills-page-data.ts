import type { SkillApiRecord, SkillApiStatus } from "../../../../core/skills/skill-api";
import type {
  RegisteredTargetRecord,
  TargetRegistrationScope
} from "../../../../core/targets/target-api";

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

export type SkillDistributionState = "no-selection" | "no-targets" | "ready";
export type SkillDistributionScope = "selected" | "single";

export type TargetOption = {
  id: string;
  name: string;
  path: string;
  scope: TargetRegistrationScope;
  selectedSkillIds: string[];
};

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

export const adaptTargetOption = (record: RegisteredTargetRecord): TargetOption => {
  return {
    id: record.id,
    name: record.name,
    path: record.path,
    scope: record.scope,
    selectedSkillIds: record.selectedSkills.map((skill) => skill.id)
  };
};

export const getTargetOptionsForSkill = (
  targets: TargetOption[],
  skill: Pick<Skill, "id"> | null
): TargetOption[] => {
  return targets.filter((target) => {
    if (target.scope === "global") {
      return true;
    }

    return skill ? target.selectedSkillIds.includes(skill.id) : false;
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

  return selectedSkills.every((skill) => getSkillDistributionState(skill) === "ready")
    ? "ready"
    : "no-targets";
};

export const getDistributionTitleKey = (
  state: SkillDistributionState,
  scope: SkillDistributionScope
) => {
  if (state === "ready") {
    return "skills.actions.syncUnavailable";
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
