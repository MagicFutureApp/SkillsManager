import type {
  RegisteredTargetRecord,
  SystemTargetRecord,
  TargetSkillSelection
} from "../../../../core/targets/target-api";

export type TargetStatus = "detected" | "missing" | "registered" | "disabled";
export type TargetSource = "system" | "registered";
export type TargetSort = "status" | "name" | "skills";

export type TargetViewModel = {
  defaultInstallStrategy: string;
  executablePath: string | null;
  id: string;
  installPath: string | null;
  name: string;
  normalizedPath: string;
  path: string;
  selectedSkills: TargetSkillSelection[];
  skillCount: number;
  source: TargetSource;
  status: TargetStatus;
  type: string;
};

export const adaptTargets = ({
  detectedTargets,
  registeredTargets
}: {
  detectedTargets: SystemTargetRecord[];
  registeredTargets: RegisteredTargetRecord[];
}): TargetViewModel[] => {
  return [
    ...detectedTargets.map(adaptSystemTarget),
    ...registeredTargets.map(adaptRegisteredTarget)
  ];
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
      target.installPath ?? "",
      target.executablePath ?? "",
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

const adaptSystemTarget = (target: SystemTargetRecord): TargetViewModel => {
  return {
    defaultInstallStrategy: target.defaultInstallStrategy,
    executablePath: target.executablePath,
    id: target.id,
    installPath: target.installPath,
    name: target.name,
    normalizedPath: target.normalizedPath,
    path: target.path,
    selectedSkills: [],
    skillCount: 0,
    source: "system",
    status: target.status,
    type: target.type
  };
};

const adaptRegisteredTarget = (target: RegisteredTargetRecord): TargetViewModel => {
  return {
    defaultInstallStrategy: target.defaultInstallStrategy,
    executablePath: null,
    id: target.id,
    installPath: target.path,
    name: target.name,
    normalizedPath: target.normalizedPath,
    path: target.path,
    selectedSkills: target.selectedSkills,
    skillCount: target.skillCount,
    source: "registered",
    status: target.enabled ? "registered" : "disabled",
    type: target.type
  };
};

const statusPriority: Record<TargetStatus, number> = {
  detected: 0,
  registered: 1,
  missing: 2,
  disabled: 3
};
