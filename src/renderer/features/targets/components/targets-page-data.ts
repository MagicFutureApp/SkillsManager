import { isBuiltInTargetType } from "../../../../core/targets/target-api";
import type {
  RegisteredTargetStatus,
  RegisteredTargetRecord,
  TargetRegistrationScope,
  TargetScanIssue,
  TargetSkillSelection
} from "../../../../core/targets/target-api";

export type TargetStatus = RegisteredTargetStatus;
export type TargetScope = TargetRegistrationScope;
export type TargetSort = "name" | "path" | "scope" | "skills";
export type TargetIssue = TargetScanIssue;

export type TargetViewModel = {
  deletable: boolean;
  id: string;
  name: string;
  normalizedPath: string;
  path: string;
  scanMessage: string | null;
  selectedSkills: TargetSkillSelection[];
  skillCount: number;
  scope: TargetScope;
  status: TargetStatus;
  type: string;
};

export const adaptTargets = ({
  registeredTargets
}: {
  registeredTargets: RegisteredTargetRecord[];
}): TargetViewModel[] => {
  return registeredTargets.map(adaptRegisteredTarget);
};

export const filterTargets = ({
  query,
  sort,
  targets
}: {
  query: string;
  sort: TargetSort;
  targets: TargetViewModel[];
}): TargetViewModel[] => {
  const normalizedQuery = query.trim().toLowerCase();
  const visible = targets.filter((target) => {
    const searchable = getTargetSearchText(target);

    return !normalizedQuery || searchable.includes(normalizedQuery);
  });

  return [...visible].sort((first, second) => {
    if (sort === "name") {
      return first.name.localeCompare(second.name);
    }

    if (sort === "skills") {
      return second.skillCount - first.skillCount || first.name.localeCompare(second.name);
    }

    if (sort === "path") {
      return first.path.localeCompare(second.path) || first.name.localeCompare(second.name);
    }

    if (sort === "scope") {
      return (
        scopePriority[first.scope] - scopePriority[second.scope] ||
        first.name.localeCompare(second.name)
      );
    }

    return first.name.localeCompare(second.name);
  });
};

const adaptRegisteredTarget = (target: RegisteredTargetRecord): TargetViewModel => {
  return {
    deletable: !isBuiltInTargetType(target.type),
    id: target.id,
    name: target.name,
    normalizedPath: target.normalizedPath,
    path: target.path,
    scanMessage: target.scanMessage,
    selectedSkills: target.selectedSkills,
    skillCount: target.skillCount,
    scope: target.scope,
    status: target.status,
    type: target.type
  };
};

const getTargetSearchText = (target: TargetViewModel): string => {
  return [
    target.name,
    target.normalizedPath,
    target.path,
    ...target.selectedSkills.map((skill) => `${skill.id} ${skill.name} ${skill.repository}`)
  ]
    .join(" ")
    .toLowerCase();
};

const scopePriority: Record<TargetScope, number> = {
  global: 0,
  independent: 1
};
