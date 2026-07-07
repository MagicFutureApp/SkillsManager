import { useEffect, useMemo, useRef, useState } from "react";

import type {
  DistributionExecuteResult,
  DistributionPreviewInput,
  DistributionPreviewResult
} from "@/global";
import {
  clampPageNumber,
  createPaginationState,
  DEFAULT_PAGE_SIZE,
  getPagedItems,
  type PaginationState
} from "@/lib/pagination";
import {
  adaptSkillRecord,
  adaptTargetOption,
  filterSkills,
  getSkillRepositoryOptions,
  getTargetOptionsForSkill,
  getSelectedSkillsDistributionState,
  type Skill,
  type SkillRepositoryFilter,
  type SkillSort,
  type TargetOption
} from "../components/skills-page-data";

export const useSkillsPageState = () => {
  const distributionExecutionTimerIdsRef = useRef<number[]>([]);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(() => new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [distributionNoticeKey, setDistributionNoticeKey] = useState<string | null>(null);
  const [distributionExecuteResult, setDistributionExecuteResult] =
    useState<DistributionExecuteResult | null>(null);
  const [distributionPreview, setDistributionPreview] = useState<DistributionPreviewResult | null>(
    null
  );
  const [distributionConfirmDialogOpen, setDistributionConfirmDialogOpen] = useState(false);
  const [distributionConflictResolutions, setDistributionConflictResolutions] = useState<
    Record<string, DistributionConflictResolution>
  >({});
  const [distributionExecutionItemStatuses, setDistributionExecutionItemStatuses] = useState<
    Record<string, DistributionExecutionItemStatus>
  >({});
  const [pendingDistribution, setPendingDistribution] = useState<PendingDistribution | null>(null);
  const [query, setQuery] = useState("");
  const [repositoryFilter, setRepositoryFilter] = useState<SkillRepositoryFilter>("all");
  const [isDistributionExecuting, setIsDistributionExecuting] = useState(false);
  const [isDistributionPreviewLoading, setIsDistributionPreviewLoading] = useState(false);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [selectedSkillId, setSelectedSkillId] = useState<string | null>(null);
  const [sort, setSort] = useState<SkillSort>("name");
  const [targetOptions, setTargetOptions] = useState<TargetOption[]>([]);

  const clearDistributionExecutionTimers = () => {
    distributionExecutionTimerIdsRef.current.forEach((timerId) => window.clearTimeout(timerId));
    distributionExecutionTimerIdsRef.current = [];
  };

  useEffect(() => {
    let isMounted = true;

    void loadSkillsPageData().then(({ skills: nextSkills, targetOptions: nextTargetOptions }) => {
      if (!isMounted) {
        return;
      }

      setSkills(nextSkills);
      setTargetOptions(nextTargetOptions);
      setSelectedSkillId((currentSkillId) => currentSkillId ?? nextSkills[0]?.id ?? null);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    return () => {
      clearDistributionExecutionTimers();
    };
  }, []);

  const filteredSkills = useMemo(() => {
    return filterSkills({
      query,
      repository: repositoryFilter,
      skills,
      sort
    });
  }, [query, repositoryFilter, skills, sort]);

  const repositoryOptions = useMemo(() => getSkillRepositoryOptions(skills), [skills]);
  const pagination = useMemo<PaginationState>(() => {
    return createPaginationState({
      currentPage,
      pageSize: DEFAULT_PAGE_SIZE,
      totalItems: filteredSkills.length
    });
  }, [currentPage, filteredSkills.length]);
  const visibleSkills = useMemo(() => {
    return getPagedItems(filteredSkills, pagination);
  }, [filteredSkills, pagination]);

  useEffect(() => {
    if (!visibleSkills.length) {
      setSelectedSkillId(null);
      return;
    }

    setSelectedSkillId((currentSkillId) => {
      if (currentSkillId && visibleSkills.some((skill) => skill.id === currentSkillId)) {
        return currentSkillId;
      }

      return visibleSkills[0]?.id ?? null;
    });
  }, [visibleSkills]);

  useEffect(() => {
    setCurrentPage(1);
  }, [query, repositoryFilter, sort]);

  useEffect(() => {
    setCurrentPage((current) => clampPageNumber(current, pagination.totalPages));
  }, [pagination.totalPages]);

  useEffect(() => {
    if (repositoryOptions.includes(repositoryFilter)) {
      return;
    }

    setRepositoryFilter("all");
  }, [repositoryFilter, repositoryOptions]);

  const selectedSkill = visibleSkills.find((skill) => skill.id === selectedSkillId) ?? null;
  const selectedSkillTargetOptions = useMemo(() => {
    return getTargetOptionsForSkill(targetOptions, selectedSkill);
  }, [selectedSkill, targetOptions]);
  const visibleIds = visibleSkills.map((skill) => skill.id);
  const checkedSkills = skills.filter((skill) => checkedIds.has(skill.id));
  const visibleCheckedCount = visibleIds.filter((id) => checkedIds.has(id)).length;
  const visibleAllChecked =
    visibleSkills.length > 0 && visibleCheckedCount === visibleSkills.length;
  const visibleSomeChecked = visibleCheckedCount > 0;
  const checkedCount = checkedIds.size;
  const checkedDistributionState = getSelectedSkillsDistributionState(checkedSkills);

  const toggleSkillChecked = (skillId: string, checked: boolean) => {
    if (checked) {
      setSelectedSkillId(skillId);
    }

    setCheckedIds((currentIds) => {
      const nextIds = new Set(currentIds);

      if (checked) {
        nextIds.add(skillId);
      } else {
        nextIds.delete(skillId);
      }

      return nextIds;
    });
  };

  const selectAllVisible = (checked: boolean) => {
    setCheckedIds((currentIds) => {
      const nextIds = new Set(currentIds);

      visibleIds.forEach((id) => {
        if (checked) {
          nextIds.add(id);
        } else {
          nextIds.delete(id);
        }
      });

      return nextIds;
    });
  };

  const setSkillsPage = (pageNumber: number) => {
    setCurrentPage(clampPageNumber(pageNumber, pagination.totalPages));
  };

  const showDistributionNotice = (key: string) => {
    setDistributionExecuteResult(null);
    setDistributionNoticeKey(key);
  };

  const startDistribution = async (
    skillUnitIds: string[],
    triggerSource: DistributionPreviewInput["triggerSource"]
  ) => {
    const nextSkillUnitIds = Array.from(new Set(skillUnitIds.filter(Boolean)));

    if (!nextSkillUnitIds.length) {
      return;
    }

    const previewDistribution = window.skillsManager?.previewDistribution;
    const executeDistribution = window.skillsManager?.executeDistribution;

    if (!previewDistribution || !executeDistribution) {
      showDistributionNotice("skills.actions.distributionUnavailableStatus");
      return;
    }

    setIsDistributionPreviewLoading(true);
    setDistributionExecuteResult(null);
    setDistributionNoticeKey(null);
    setDistributionExecutionItemStatuses({});
    clearDistributionExecutionTimers();

    try {
      const preview = await previewDistribution({
        skillUnitIds: nextSkillUnitIds,
        triggerSource
      });

      setDistributionPreview(preview);
      setDistributionConflictResolutions(createDefaultConflictResolutions(preview));
      setPendingDistribution({ skillUnitIds: nextSkillUnitIds, triggerSource });
      setDistributionConfirmDialogOpen(preview.items.length > 0);

      if (!preview.items.length) {
        showDistributionNotice("skills.actions.distributionEmptyStatus");
      }
    } catch {
      showDistributionNotice("skills.actions.distributionPreviewFailedStatus");
    } finally {
      setIsDistributionPreviewLoading(false);
    }
  };

  const startSelectedSkillDistribution = () => {
    if (!selectedSkill || selectedSkill.targets.length === 0) {
      return;
    }

    void startDistribution([selectedSkill.id], "skill_detail");
  };

  const startSkillDistribution = (skillUnitId: string) => {
    void startDistribution([skillUnitId], "skill_detail");
  };

  const startSelectedSkillsDistribution = () => {
    void startDistribution(
      checkedSkills.map((skill) => skill.id),
      "skills_bulk"
    );
  };

  const closeDistributionConfirmDialog = () => {
    if (isDistributionExecuting) {
      return;
    }

    setDistributionConfirmDialogOpen(false);
  };

  const setDistributionConflictResolution = (
    previewItemId: string,
    resolution: DistributionConflictResolution
  ) => {
    setDistributionConflictResolutions((currentResolutions) => ({
      ...currentResolutions,
      [previewItemId]: resolution
    }));
  };

  const executeCurrentDistribution = async () => {
    const executeDistribution = window.skillsManager?.executeDistribution;

    if (!distributionPreview || !pendingDistribution || !executeDistribution) {
      showDistributionNotice("skills.actions.distributionUnavailableStatus");
      return;
    }

    setIsDistributionExecuting(true);
    setDistributionNoticeKey(null);
    clearDistributionExecutionTimers();

    const startedAt = Date.now();
    const previewItemIds = distributionPreview.items.map((item) => item.id);

    setDistributionExecutionItemStatuses(
      createDistributionExecutionItemStatuses(previewItemIds, "loading")
    );

    try {
      const result = await executeDistribution({
        conflictResolutions: distributionPreview.items
          .filter((item) => item.action === "conflict")
          .map((item) => ({
            agentTargetId: item.agentTargetId,
            previewItemId: item.id,
            resolution:
              distributionConflictResolutions[item.id] ?? item.defaultResolution ?? "overwrite",
            skillUnitId: item.skillUnitId,
            targetPath: item.targetPath
          })),
        skillUnitIds: pendingDistribution.skillUnitIds,
        triggerSource: pendingDistribution.triggerSource
      });

      scheduleDistributionExecutionCompletion({
        onFinish: () => setDistributionExecuteResult(result),
        previewItemIds,
        startedAt
      });
    } catch {
      scheduleDistributionExecutionCompletion({
        onFinish: () => showDistributionNotice("skills.actions.distributionFailedStatus"),
        previewItemIds,
        startedAt
      });
    }
  };

  const scheduleDistributionExecutionCompletion = ({
    onFinish,
    previewItemIds,
    startedAt
  }: {
    onFinish: () => void;
    previewItemIds: string[];
    startedAt: number;
  }) => {
    const elapsedMs = Date.now() - startedAt;
    const completeDelayMs = Math.max(0, MIN_DISTRIBUTION_ITEM_LOADING_MS - elapsedMs);
    const closeDelayMs = Math.max(0, MIN_DISTRIBUTION_DIALOG_OPEN_MS - elapsedMs);

    const completeTimerId = window.setTimeout(() => {
      setDistributionExecutionItemStatuses(
        createDistributionExecutionItemStatuses(previewItemIds, "completed")
      );
    }, completeDelayMs);
    const closeTimerId = window.setTimeout(() => {
      onFinish();
      setDistributionConfirmDialogOpen(false);
      setIsDistributionExecuting(false);
      setDistributionExecutionItemStatuses({});
    }, closeDelayMs);

    distributionExecutionTimerIdsRef.current.push(completeTimerId, closeTimerId);
  };

  const toggleSkillTargetPreference = (skillId: string, targetId: string, enabled: boolean) => {
    setSkills((currentSkills) => {
      return currentSkills.map((skill) => {
        if (skill.id !== skillId) {
          return skill;
        }

        const nextTargets = enabled
          ? Array.from(new Set([...skill.targets, targetId]))
          : skill.targets.filter((id) => id !== targetId);

        return {
          ...skill,
          targets: nextTargets
        };
      });
    });
    setTargetOptions((currentTargets) => {
      return currentTargets.map((target) => {
        if (target.id !== targetId || target.skillPreferenceIds.includes(skillId)) {
          return target;
        }

        return {
          ...target,
          skillPreferenceIds: [...target.skillPreferenceIds, skillId]
        };
      });
    });

    void window.skillsManager?.setSkillTargetPreference?.({
      agentTargetId: targetId,
      enabled,
      skillUnitId: skillId
    });
  };

  const addSyncTargetForSelectedSkill = async () => {
    if (!selectedSkill) {
      return;
    }

    const selectedPath = await window.skillsManager?.selectTargetDirectory?.();

    if (!selectedPath) {
      return;
    }

    const result = await window.skillsManager?.addSkillDirectoryTarget?.({
      skillUnitId: selectedSkill.id,
      targetPath: selectedPath
    });
    const nextTargets = (result?.registeredTargets ?? [])
      .filter((target) => target.enabled)
      .map(adaptTargetOption);
    const nextSelectedSkillTargets = nextTargets
      .filter((target) => {
        if (target.scope === "global") {
          return selectedSkill.targets.includes(target.id);
        }

        return target.selectedSkillIds.includes(selectedSkill.id);
      })
      .map((target) => target.id);

    setTargetOptions(nextTargets);
    setSkills((currentSkills) => {
      return currentSkills.map((skill) => {
        if (skill.id !== selectedSkill.id) {
          return skill;
        }

        return {
          ...skill,
          targets: nextSelectedSkillTargets
        };
      });
    });
  };

  return {
    checkedDistributionState,
    checkedCount,
    checkedIds,
    distributionConflictResolutions,
    distributionConfirmDialogOpen,
    distributionExecutionItemStatuses,
    distributionExecuteResult,
    distributionNoticeKey,
    distributionNoticeVisible: Boolean(distributionNoticeKey || distributionExecuteResult),
    distributionPreview,
    isDistributionExecuting,
    isDistributionPreviewLoading,
    query,
    repositoryFilter,
    repositoryOptions,
    pagination,
    selectedSkill,
    selectedSkillId,
    selectedSkillTargetOptions,
    skills,
    sort,
    visibleAllChecked,
    visibleSkills,
    visibleSomeChecked,
    closeDistributionConfirmDialog,
    executeCurrentDistribution,
    selectAllVisible,
    setDistributionConflictResolution,
    setSkillsPage,
    setQuery,
    setRepositoryFilter,
    setSelectedSkillId,
    setSort,
    addSyncTargetForSelectedSkill,
    startSelectedSkillDistribution,
    startSelectedSkillsDistribution,
    startSkillDistribution,
    toggleSkillChecked,
    toggleSkillTargetPreference
  };
};

export type SkillsPageState = ReturnType<typeof useSkillsPageState>;

const loadSkillsPageData = async (): Promise<{
  skills: Skill[];
  targetOptions: TargetOption[];
}> => {
  const [skillsResult, targetsResult] = await Promise.all([
    window.skillsManager?.listSkills?.(),
    window.skillsManager?.listTargets?.()
  ]);

  return {
    skills: (skillsResult?.skills ?? []).map(adaptSkillRecord),
    targetOptions: (targetsResult?.registeredTargets ?? [])
      .filter((target) => target.enabled)
      .map(adaptTargetOption)
  };
};

type DistributionConflictResolution = NonNullable<
  DistributionPreviewResult["items"][number]["defaultResolution"]
>;

type PendingDistribution = {
  skillUnitIds: string[];
  triggerSource: DistributionPreviewInput["triggerSource"];
};

type DistributionExecutionItemStatus = "completed" | "loading";

const MIN_DISTRIBUTION_ITEM_LOADING_MS = 1000;
const MIN_DISTRIBUTION_DIALOG_OPEN_MS = 2000;

const createDistributionExecutionItemStatuses = (
  itemIds: string[],
  status: DistributionExecutionItemStatus
): Record<string, DistributionExecutionItemStatus> => {
  return Object.fromEntries(itemIds.map((itemId) => [itemId, status]));
};

const createDefaultConflictResolutions = (
  preview: DistributionPreviewResult
): Record<string, DistributionConflictResolution> => {
  return Object.fromEntries(
    preview.items
      .filter((item) => item.action === "conflict")
      .map((item) => [item.id, item.defaultResolution ?? "overwrite"])
  );
};
