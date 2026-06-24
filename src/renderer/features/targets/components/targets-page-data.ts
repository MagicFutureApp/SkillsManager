import type {
  RegisteredTargetStatus,
  RegisteredTargetRecord,
  TargetRegistrationScope,
  TargetScanIssue,
  TargetSkillSelection
} from "../../../../core/targets/target-api";

export type TargetStatus = RegisteredTargetStatus;
export type TargetScope = TargetRegistrationScope;
export type TargetSort = "status" | "name" | "skills";
export type TargetIssue = TargetScanIssue;

export type TargetViewModel = {
  defaultInstallStrategy: string;
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
    const searchable = [
      target.name,
      target.type,
      target.path,
      target.scope,
      ...target.selectedSkills.map((skill) => `${skill.name} ${skill.repository}`)
    ]
      .join(" ")
      .toLowerCase();

    return !normalizedQuery || searchable.includes(normalizedQuery);
  });

  return [...visible].sort((first, second) => {
    if (sort === "name") {
      return first.name.localeCompare(second.name);
    }

    if (sort === "skills") {
      return second.skillCount - first.skillCount || first.name.localeCompare(second.name);
    }

    return (
      statusPriority[first.status] - statusPriority[second.status] ||
      first.name.localeCompare(second.name)
    );
  });
};

const adaptRegisteredTarget = (target: RegisteredTargetRecord): TargetViewModel => {
  return {
    defaultInstallStrategy: target.defaultInstallStrategy,
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

const statusPriority: Record<TargetStatus, number> = {
  detected: 0,
  registered: 1,
  "path-missing": 2,
  "not-writable": 3,
  "not-directory": 4,
  "scan-error": 5,
  "app-missing": 6,
  missing: 7,
  disabled: 8
};
