import { create } from "zustand";

import {
  adaptSkillRecord,
  adaptTargetOption,
  pruneSkillTargets,
  type ShellNavigationBadgeCounts,
  type Skill
} from "@/stores/skill-data";
import type { RegisteredTargetRecord } from "../../core/targets/target-api";
import type { TargetsListResult } from "@/global";

/**
 * 跨 tab 共享的数据桶。
 *
 * Skills 与 Targets 两个页面都从这里的 `skills` / `registeredTargets` 读取领域数据，
 * 任意页面的 mutation 都写回这里，从而让被 keep-alive 保活（隐藏但常驻）的页面在
 * 其他 tab 发生增删改后仍能渲染出最新数据，而不丢失自身的 UI 状态（查询词、分页、
 * 选中项、滚动位置）。
 *
 * 加载由 `loadSharedPageData` 按 `status` 去重：只有首个挂载页面（默认 Skills）真正拉取，
 * 其余页面在 `status === "ready"` 时直接复用，避免重复请求。`refresh` 可绕过该去重强制重拉，
 * 用于「其他来源已改变底层数据、需要让常驻页面反映最新快照」的场景（如 Repositories 同步后）。
 */

type DataStore = {
  skills: Skill[];
  registeredTargets: RegisteredTargetRecord[];
  status: "idle" | "loading" | "ready" | "error";
  loadSharedPageData: () => Promise<void>;
  refresh: () => Promise<void>;
  refreshSkills: () => Promise<void>;
  setRegisteredTargets: (targets: RegisteredTargetRecord[]) => void;
  badgeCounts: ShellNavigationBadgeCounts;
  refreshBadgeCounts: () => void;
  applySkillTargetsResult: (
    result: TargetsListResult | undefined,
    options: { existingTargetIds: string[]; skillId: string }
  ) => void;
  toggleSkillTargetPreferenceLocally: (skillId: string, targetId: string, enabled: boolean) => void;
  removeSkillTargetLocally: (options: {
    removeTargetPreference: boolean;
    skillId: string;
    targetId: string;
  }) => void;
  reset: () => void;
};

let loadPromise: Promise<void> | null = null;
// 每次 loadSharedPageData / refresh / reset 都会自增；在途的异步加载只有 epoch 与当前一致时才允许写回，
// 避免上一个用例遗留的 Promise.all 在 reset() 之后把过期数据写进共享桶（跨用例污染）。
let loadEpoch = 0;

// 比较两个 registeredTargets 的 id 集合是否一致（忽略顺序与字段差异），
// 用于 setRegisteredTargets 判断「是否真的变化」以避免无谓的徽标 IPC（R25）。
const registeredTargetIdSet = (targets: RegisteredTargetRecord[]) =>
  new Set(targets.map((target) => target.id));
const sameRegisteredTargetIds = (a: RegisteredTargetRecord[], b: RegisteredTargetRecord[]): boolean => {
  if (a.length !== b.length) {
    return false;
  }

  const ids = registeredTargetIdSet(a);

  return b.every((target) => ids.has(target.id));
};

// 比较两组 registeredTargets 的「已启用 id 集合」是否一致（忽略 disabled 与字段差异），
// 用于 setRegisteredTargets 判断 enabled 是否真的变化，以便触发 refreshSkills 重供货 skill.targets（R33）。
const enabledTargetIdSet = (targets: RegisteredTargetRecord[]) =>
  new Set(targets.filter((target) => target.enabled).map((target) => target.id));
const sameEnabledTargetIds = (a: RegisteredTargetRecord[], b: RegisteredTargetRecord[]): boolean => {
  const enabledA = enabledTargetIdSet(a);
  const enabledB = enabledTargetIdSet(b);

  if (enabledA.size !== enabledB.size) {
    return false;
  }

  return [...enabledB].every((id) => enabledA.has(id));
};

export const useDataStore = create<DataStore>((set, get) => ({
  skills: [],
  registeredTargets: [],
  status: "idle",
  badgeCounts: {},
  loadSharedPageData: () => {
    if (get().status === "ready") {
      return Promise.resolve();
    }

    if (loadPromise) {
      return loadPromise;
    }

    const epoch = ++loadEpoch;

    set({ status: "loading" });

    loadPromise = (async () => {
      try {
        const [skillsResult, targetsResult] = await Promise.all([
          window.skillsManager?.listSkills?.(),
          window.skillsManager?.listTargets?.()
        ]);

        if (epoch !== loadEpoch) {
          return;
        }

        // 逐项判定每个接口是否可用（对象存在即为可用；返回空数组属正常成功，不应报错）。
        // 任一接口缺失/异常 → 整体 status 置 "error"（让 UI 报错+重试，R18/R30），但该项对应数据
        // 保留桶内已有值、不清成 []，与 catch 分支（只置 status、不抹既有数据）语义一致（R30）。
        // 原实现 `!skillsResult && !targetsResult` 只在「双侧都缺」时报错，单侧缺失仍被固化为
        // ready 并沉默走老 P1 路径——这是 R30 修复的点。
        const skillsUnavailable = !skillsResult;
        const targetsUnavailable = !targetsResult;
        const anyUnavailable = skillsUnavailable || targetsUnavailable;
        set({
          skills: skillsUnavailable
            ? get().skills
            : (skillsResult?.skills ?? []).map(adaptSkillRecord),
          registeredTargets: targetsUnavailable
            ? get().registeredTargets
            : (targetsResult?.registeredTargets ?? []),
          status: anyUnavailable ? "error" : "ready"
        });
      } catch {
        // 加载失败不让 status 永久停在 "loading"：置为 "error"，
        // 由 UI 消费 status 给出错误提示与重试入口（AppShell 错误条调用 refresh 重新拉取）。
        // 注意：loadSharedPageData 只在 status==="ready" 时去重，error 态并不拦截，
        // 故非 keep-alive 页面真实重挂载时会再次进入拉取（隐式重试仍存在）；
        // keep-alive 保活页面不重挂载，重试只能靠显式 refresh（R18 + R28 + R41-2）。
        if (epoch === loadEpoch) {
          set({ status: "error" });
        }
      } finally {
        if (epoch === loadEpoch) {
          loadPromise = null;
        }
      }
    })();

    return loadPromise;
  },
  // 绕过 status === "ready" 的一次性守卫，强制重新拉取。
  // 用于「其他来源已改动底层数据、常驻页面需要反映最新快照」的场景：
  // 例如 Repositories 页同步出新技能后，让 Skills 页（保活、不重挂载）也能拿到新数据。
  refresh: () => {
    loadEpoch += 1;
    loadPromise = null;
    set({ status: "idle" });

    return get().loadSharedPageData().then(() => {
      get().refreshBadgeCounts();
    });
  },
  // 仅重拉 listSkills 以重新供货 skill.targets。pruneSkillTargets 是写时裁剪、只删不补，
  // 某 target 因扫描状态（path-missing 等）变为 enabled=false 被剥掉的 id，需靠 listSkills
  // 重拉才能加回。刻意不触动 registeredTargets，避免覆盖 Targets 页刚 rescan 得到的结果（R10②）。
  // R12 之后 listSkills 已按 agent_targets.enabled 过滤，故 refreshSkills 重拉得到的数据与
  // pruneSkillTargets 口径一致（不会再把 disabled target 灌回），与 R4 的 prune 不再互斥。
  refreshSkills: () => {
    const epoch = loadEpoch;
    return (async () => {
      try {
        const skillsResult = await window.skillsManager?.listSkills?.();
        // reset/refresh 之后 loadEpoch 已递增，本次过期结果不应写回共享桶（R14）。
        if (epoch !== loadEpoch) {
          return;
        }
        if (skillsResult?.skills) {
          set({ skills: skillsResult.skills.map(adaptSkillRecord) });
        }
      } catch {
        // 重拉失败静默放弃，保留既有 skills，不冒 unhandled rejection（R14）。
      }
    })();
  },
  setRegisteredTargets: (registeredTargets) => {
    const prev = get().registeredTargets;
    const targetsChanged = !sameRegisteredTargetIds(prev, registeredTargets);
    const enabledChanged = !sameEnabledTargetIds(prev, registeredTargets);

    set((state) => ({
      registeredTargets,
      // 整体替换 registeredTargets 的同时，会按当前注册 target 集合裁剪 skills[].targets（P0-2）。
      // 隐式契约：调用方必须传入「完整」的 registeredTargets；传 [] 会连同清空所有 skill.targets。
      // 若将来需要「只清空目标而不动技能关联」，应使用独立动作而非本 setter（R5）。
      skills: pruneSkillTargets(state.skills, registeredTargets)
    }));
    // registeredTargets 真正变化（如 rescan 增删目标）时才刷新侧边栏 targets 徽标计数，
    // 引用相同/内容未变时不重复发徽标 IPC（R25）。
    if (targetsChanged) {
      get().refreshBadgeCounts();
    }
    // enabled 集合变化（如编辑目标被 repository 无条件置 enabled=true、rescan 重新检测到目标）
    // 需重拉 listSkills 重新供货 skills[].targets，否则 skills[].targets 与 DB 口径分裂（R33）。
    // 收口在此，避免各调用方手写 refreshSkills（此前 saveEditTarget 漏调导致 P1）。
    if (enabledChanged) {
      void get().refreshSkills();
    }
  },
  applySkillTargetsResult: (result, { existingTargetIds, skillId }) => {
    // 防御：result 为空（如调用方传入未定义值）时不写桶，避免把共享桶目标写空（R37）。
    if (!result) {
      return;
    }

    const rawTargets = result.registeredTargets ?? [];
    const nextTargetOptions = rawTargets.filter((target) => target.enabled).map(adaptTargetOption);
    const nextSelectedSkillTargets = nextTargetOptions
      .filter((target) => {
        if (target.scope === "global") {
          return existingTargetIds.includes(target.id);
        }

        return target.selectedSkillIds.includes(skillId);
      })
      .map((target) => target.id);

    set((state) => ({
      registeredTargets: rawTargets,
      // 与 setRegisteredTargets 契约对齐：整体替换后对所有 skill 跑一遍 pruneSkillTargets，
      // 保证 skills[].targets 只含「偏好启用且目标自身启用」的 id，避免单点修改后口径与其它路径分裂（§4.5）。
      skills: pruneSkillTargets(
        state.skills.map((skill) =>
          skill.id === skillId ? { ...skill, targets: nextSelectedSkillTargets } : skill
        ),
        rawTargets
      )
    }));
    // Skills 页新增/调整目标后，侧边栏 targets 徽标需同步刷新，
    // 与 setRegisteredTargets 的行为对齐，避免两条同类路径口径不一致（R17）。
    get().refreshBadgeCounts();
  },
  toggleSkillTargetPreferenceLocally: (skillId, targetId, enabled) => {
    set((state) => ({
      skills: state.skills.map((skill) => {
        if (skill.id !== skillId) {
          return skill;
        }

        const nextTargets = enabled
          ? Array.from(new Set([...skill.targets, targetId]))
          : skill.targets.filter((id) => id !== targetId);

        return { ...skill, targets: nextTargets };
      }),
      registeredTargets: state.registeredTargets.map((target) => {
        if (target.id !== targetId) {
          return target;
        }

        const existingPref = target.skillPreferences.find((pref) => pref.id === skillId);

        if (existingPref) {
          // 已存在偏好：启用时同步把 enabled 置为传入值（R24c）。此前该分支直接返回 target、
          // 从不更新 enabled，导致 store 内 skillPreferences[].enabled 永远为真、与 DB 分裂。
          if (existingPref.enabled === enabled) {
            return target;
          }

          return {
            ...target,
            skillPreferences: target.skillPreferences.map((pref) =>
              pref.id === skillId ? { ...pref, enabled } : pref
            )
          };
        }

        const skill = state.skills.find((currentSkill) => currentSkill.id === skillId);

        return {
          ...target,
          skillPreferences: [
            ...target.skillPreferences,
            {
              enabled,
              id: skillId,
              name: skill?.name ?? "",
              repository: skill?.repository ?? ""
            }
          ]
        };
      })
    }));
  },
  removeSkillTargetLocally: ({ removeTargetPreference, skillId, targetId }) => {
    set((state) => ({
      skills: state.skills.map((skill) => {
        if (skill.id !== skillId) {
          return skill;
        }

        return { ...skill, targets: skill.targets.filter((id) => id !== targetId) };
      }),
      registeredTargets: state.registeredTargets.map((target) => {
        if (target.id !== targetId) {
          return target;
        }

        return {
          ...target,
          selectedSkills: target.selectedSkills.filter((skill) => skill.id !== skillId),
          // 取消该技能对 target 的勾选：保留偏好时把 enabled 置 false（与刚落库的 enabled=false 对齐，R24b）；
          // 此前「保留偏好且 pref 不存在」时误写成 enabled:true，与「刚取消启用」语义相反。pref 存在时
          // 也同样把 enabled 翻成 false，避免 store 内恒 true 与 DB 分裂（R24c）。
          skillPreferences: removeTargetPreference
            ? target.skillPreferences.filter((pref) => pref.id !== skillId)
            : (() => {
                const hasPref = target.skillPreferences.some((pref) => pref.id === skillId);

                if (hasPref) {
                  return target.skillPreferences.map((pref) =>
                    pref.id === skillId ? { ...pref, enabled: false } : pref
                  );
                }

                return [
                  ...target.skillPreferences,
                  { enabled: false, id: skillId, name: "", repository: "" }
                ];
              })()
        };
      })
    }));
  },
  reset: () => {
    loadEpoch += 1;
    loadPromise = null;
    // 先清空徽标，再按 DB 重拉；避免测试隔离不足时读到上一用例残留的徽标（R15）。
    set({ skills: [], registeredTargets: [], status: "idle", badgeCounts: {} });
    get().refreshBadgeCounts();
  },
  // 侧边栏导航徽标计数：独立 API，集中在此维护，使同步/删除/编辑来源（refresh）与重置
  // 之后徽标数与 Skills 页数据保持一致（R11）。app-shell 挂载时触发一次初始拉取。
  refreshBadgeCounts: () => {
    const skillsManager = window.skillsManager;
    const fetchBadgeCounts = skillsManager?.getNavigationBadgeCounts?.();

    if (!fetchBadgeCounts) {
      return;
    }

    // 捕获当前 epoch：reset()/refresh() 之后 loadEpoch 已递增，本次过期结果不应写回共享桶（R36）。
    const epoch = loadEpoch;

    void fetchBadgeCounts
      .then((result) => {
        if (epoch !== loadEpoch) {
          return;
        }

        if (result?.counts) {
          set({ badgeCounts: result.counts });
        }
      })
      .catch(() => {});
  }
}));
