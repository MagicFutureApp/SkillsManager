import type { AppRouteId } from "@/app/route-config";
import type { SkillApiRecord, SkillApiStatus } from "../../core/skills/skill-api";
import type { RegisteredTargetRecord, TargetRegistrationScope } from "../../core/targets/target-api";

/**
 * 共享数据桶（`stores/data-store.ts`）与 Skills 页面共用的领域类型与适配器。
 *
 * 放在 `stores` 层而非 `features/skills`，是为了切断 `data-store` → `features`
 * 的反向依赖：store 只依赖这个与 feature 无关的中性模块，避免形成循环导入。
 * `features/skills/components/skills-page-data.ts` 从这里 re-export，保证既有导入方无需改动。
 */

export type Skill = {
  id: string;
  skillId: string;
  name: string;
  repository: string;
  version: string;
  entry: string;
  description: string;
  status: SkillApiStatus;
  targets: string[];
  tags: string[];
};

export type TargetOption = {
  id: string;
  name: string;
  path: string;
  scope: TargetRegistrationScope;
  selectedSkillIds: string[];
  skillPreferenceIds: string[];
};

// 侧边栏导航徽标计数类型，集中放在中性模块以避免 `data-store` 反向依赖 `features/shell`（R21）。
export type ShellNavigationBadgeCounts = Partial<Record<AppRouteId | "diagnostics", number>>;

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
    selectedSkillIds: record.selectedSkills.map((skill) => skill.id),
    skillPreferenceIds: record.skillPreferences.map((skill) => skill.id)
  };
};

/**
 * 把每个 skill 的 `targets` 裁剪到当前仍然存在的 target id 集合。
 *
 * Targets 页删除 / 编辑 target 时只重写了 `registeredTargets`，不会回写 `skills[].targets`；
 * 不裁剪的话，已删 target 的 id 仍残留在 `skill.targets` 里，导致 4 个读取点（分发门禁、
 * 分发状态、`skills-page-sider` 勾选态、`skills-page-main` 目标数）展示过期数据。
 */
export const pruneSkillTargets = (
  skills: Skill[],
  registeredTargets: RegisteredTargetRecord[]
): Skill[] => {
  // 保留集按 enabled 过滤：渲染侧 RegisteredTargetRecord.enabled 来自 agent_targets.enabled，由扫描状态决定
  // （targetRepository.ts:329,343 的 enabled = status === "detected"），与 skill_target_preferences 偏好无关。
  // 这与自动分发资格判定对齐（countEnabledTargetPreferences，repositoryRepository.ts:806-826 同时要求
  // skillTargetPreferences.enabled 与 agentTargets.enabled 为真）；比 DB listSkills 的 targets（仅按
  // skill_target_preferences.enabled 过滤）更严，故「禁用 / 不可达的 target」不会残留在 skill.targets（R4 / R10）。
  const registeredIds = new Set(
    registeredTargets.filter((target) => target.enabled).map((target) => target.id)
  );

  // 无需裁剪时直接复用入参数组引用，避免每次整体替换都让 state.skills 换引用、
  // 触发 Skills 页整表重算重渲染（R26）。
  if (skills.every((skill) => skill.targets.every((id) => registeredIds.has(id)))) {
    return skills;
  }

  return skills.map((skill) => {
    if (skill.targets.every((id) => registeredIds.has(id))) {
      return skill;
    }

    return { ...skill, targets: skill.targets.filter((id) => registeredIds.has(id)) };
  });
};
