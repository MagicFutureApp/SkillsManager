import { beforeEach, describe, expect, it, vi } from "vitest";

import { pruneSkillTargets, type Skill } from "@/stores/skill-data";
import { useDataStore } from "@/stores/data-store";
import type { RegisteredTargetRecord } from "../../core/targets/target-api";
import type { TargetsListResult } from "@/global";

const makeSkill = (over: Partial<Skill> = {}): Skill => ({
  description: "",
  entry: "",
  id: "skill-1",
  name: "Skill One",
  repository: "repo-1",
  skillId: "skill-1",
  status: "installed",
  tags: [],
  targets: [],
  version: "1.0.0",
  ...over
});

const makeTarget = (over: Partial<RegisteredTargetRecord> = {}): RegisteredTargetRecord => ({
  createdAt: "2026-06-21T00:00:00.000Z",
  enabled: true,
  id: "target-1",
  name: "Local",
  normalizedPath: "/p/.codex/skills",
  path: "/p/.codex/skills",
  scanMessage: null,
  selectedSkills: [],
  skillPreferences: [],
  skillCount: 0,
  scope: "global",
  status: "registered",
  type: "custom-directory",
  updatedAt: "2026-06-21T00:00:00.000Z",
  ...over
});

describe("data-store", () => {
  let listSkills: ReturnType<typeof vi.fn>;
  let listTargets: ReturnType<typeof vi.fn>;
  let getNavigationBadgeCounts: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    listSkills = vi.fn();
    listTargets = vi.fn();
    getNavigationBadgeCounts = vi.fn().mockResolvedValue({
      counts: { repositories: 0, skills: 0, targets: 0 }
    });
    window.skillsManager = {
      getNavigationBadgeCounts,
      listSkills,
      listTargets,
      setSkillTargetPreference: vi.fn().mockResolvedValue(undefined)
    } as unknown as typeof window.skillsManager;
    // store 是模块级单例，跨用例复用会不发 IPC；每次复位隔离（R15）。
    useDataStore.getState().reset();
  });

  describe("loadSharedPageData 三态（R18/R30）", () => {
    it("双侧接口缺失 → status error（不再固化为 ready）", async () => {
      listSkills.mockResolvedValue(undefined);
      listTargets.mockResolvedValue(undefined);

      await useDataStore.getState().loadSharedPageData();

      expect(useDataStore.getState().status).toBe("error");
    });

    it("单侧缺失 → status error，且保留另一侧已有数据（不清 []）", async () => {
      useDataStore.setState({
        skills: [makeSkill({ id: "s1" })],
        registeredTargets: [],
        // 设回 idle 才能绕过 status==="ready" 的加载去重守卫，重新进入拉取
        status: "idle"
      });
      listSkills.mockResolvedValue({ skills: [makeSkill({ id: "s1" })] });
      listTargets.mockResolvedValue(undefined);

      await useDataStore.getState().loadSharedPageData();

      const state = useDataStore.getState();
      expect(state.status).toBe("error");
      expect(state.skills).toHaveLength(1);
      expect(state.registeredTargets).toHaveLength(0);
    });

    it("双侧就绪（含合法空结果）→ status ready", async () => {
      listSkills.mockResolvedValue({ skills: [] });
      listTargets.mockResolvedValue({ registeredTargets: [] });

      await useDataStore.getState().loadSharedPageData();

      expect(useDataStore.getState().status).toBe("ready");
    });
  });

  describe("applySkillTargetsResult 刷徽标（R17）", () => {
    it("触发一次 refreshBadgeCounts", () => {
      getNavigationBadgeCounts.mockClear();
      const result: TargetsListResult = { registeredTargets: [makeTarget()] };
      useDataStore.getState().applySkillTargetsResult(result, {
        existingTargetIds: [],
        skillId: "s1"
      });
      expect(getNavigationBadgeCounts).toHaveBeenCalledTimes(1);
    });
  });

  describe("setRegisteredTargets 徽标门禁（R25）", () => {
    it("同引用 → 不刷徽标", () => {
      const targets = [makeTarget()];
      useDataStore.setState({ registeredTargets: targets, skills: [] });
      getNavigationBadgeCounts.mockClear();
      useDataStore.getState().setRegisteredTargets(targets);
      expect(getNavigationBadgeCounts).not.toHaveBeenCalled();
    });

    it("同 id 集合但内容变化 → 不刷（id 集合同）", () => {
      const a = [makeTarget({ id: "t1" })];
      const b = [makeTarget({ id: "t1", name: "renamed" })];
      useDataStore.setState({ registeredTargets: a, skills: [] });
      getNavigationBadgeCounts.mockClear();
      useDataStore.getState().setRegisteredTargets(b);
      expect(getNavigationBadgeCounts).not.toHaveBeenCalled();
    });

    it("新增 id → 刷一次", () => {
      const a = [makeTarget({ id: "t1" })];
      const b = [makeTarget({ id: "t1" }), makeTarget({ id: "t2" })];
      useDataStore.setState({ registeredTargets: a, skills: [] });
      getNavigationBadgeCounts.mockClear();
      useDataStore.getState().setRegisteredTargets(b);
      expect(getNavigationBadgeCounts).toHaveBeenCalledTimes(1);
    });
  });

  describe("pruneSkillTargets 引用复用（R26）", () => {
    it("无需裁剪 → 复用入参数组引用", () => {
      const skills = [makeSkill({ targets: ["t1"] })];
      const targets = [makeTarget({ id: "t1", enabled: true })];
      const result = pruneSkillTargets(skills, targets);
      expect(result).toBe(skills);
    });

    it("需裁剪 → 新引用并去掉缺失 target", () => {
      const skills = [makeSkill({ targets: ["t1", "t2"] })];
      const targets = [makeTarget({ id: "t1", enabled: true })];
      const result = pruneSkillTargets(skills, targets);
      expect(result).not.toBe(skills);
      expect(result[0].targets).toEqual(["t1"]);
    });
  });

  describe("setRegisteredTargets enabled 变化 → refreshSkills（R33）", () => {
    it("enabled 集合变化 → 触发 refreshSkills 重拉 listSkills", async () => {
      useDataStore.setState({
        skills: [makeSkill({ id: "s1", targets: ["t1"] })],
        registeredTargets: [makeTarget({ id: "t1", enabled: false })],
        status: "ready"
      });
      listSkills.mockResolvedValue({ skills: [makeSkill({ id: "s1", targets: ["t1"] })] });
      listSkills.mockClear();

      useDataStore.getState().setRegisteredTargets([makeTarget({ id: "t1", enabled: true })]);

      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(listSkills).toHaveBeenCalledTimes(1);
    });

    it("enabled 集合未变 → 不触发 refreshSkills", async () => {
      useDataStore.setState({
        skills: [makeSkill({ id: "s1", targets: ["t1"] })],
        registeredTargets: [makeTarget({ id: "t1", enabled: true })],
        status: "ready"
      });
      listSkills.mockResolvedValue({ skills: [makeSkill({ id: "s1", targets: ["t1"] })] });
      listSkills.mockClear();

      useDataStore.getState().setRegisteredTargets([makeTarget({ id: "t1", enabled: true })]);

      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(listSkills).not.toHaveBeenCalled();
    });
  });

  describe("setRegisteredTargets 裁剪 skills[].targets（R34 契约）", () => {
    it("registeredTargets 为空（确无目标）→ 清空所有 skill.targets", () => {
      useDataStore.setState({
        skills: [makeSkill({ id: "s1", targets: ["t1", "t2"] })],
        registeredTargets: [],
        status: "ready"
      });

      useDataStore.getState().setRegisteredTargets([]);

      expect(useDataStore.getState().skills[0].targets).toEqual([]);
    });

    it("含 disabled 目标 → 裁剪掉未启用的 target id（不依赖 refreshSkills）", () => {
      useDataStore.setState({
        skills: [makeSkill({ id: "s1", targets: ["t1", "t2"] })],
        registeredTargets: [
          makeTarget({ id: "t1", enabled: true }),
          makeTarget({ id: "t2", enabled: false })
        ],
        status: "ready"
      });

      useDataStore
        .getState()
        .setRegisteredTargets([
          makeTarget({ id: "t1", enabled: true }),
          makeTarget({ id: "t2", enabled: false })
        ]);

      expect(useDataStore.getState().skills[0].targets).toEqual(["t1"]);
    });
  });
});
