import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type {
  DistributionExecuteInput,
  DistributionExecuteResult,
  DistributionPreviewInput,
  DistributionPreviewResult,
  TargetsListResult
} from "@/global";
import {
  clampPageNumber,
  createPaginationState,
  DEFAULT_PAGE_SIZE,
  getPagedItems,
  type PaginationState
} from "@/lib/pagination";
import {
  adaptTargetOption,
  filterSkills,
  getSkillRepositoryOptions,
  getTargetOptionsForSkill,
  getSelectedSkillsDistributionState,
  type SkillRepositoryFilter,
  type SkillSort,
  type TargetOption
} from "../components/skills-page-data";
import { useTargetAddDialogState } from "../../targets/hooks/use-target-add-dialog-state";
import { useDataStore } from "@/stores/data-store";

export const useSkillsPageState = () => {
  const distributionExecutionTimerIdsRef = useRef<number[]>([]);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(() => new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [distributionNoticeKey, setDistributionNoticeKey] = useState<string | null>(null);
  const [distributionExecuteResult, setDistributionExecuteResult] =
    useState<DistributionExecuteResult | null>(null);
  const [distributionNoticeDismissed, setDistributionNoticeDismissed] = useState(false);
  const [distributionPreview, setDistributionPreview] = useState<DistributionPreviewResult | null>(
    null
  );
  const [distributionConfirmDialogOpen, setDistributionConfirmDialogOpen] = useState(false);
  const [distributionConflictResolutions, setDistributionConflictResolutions] = useState<
    Record<string, DistributionConflictResolution>
  >({});
  const [distributionRuntimeOverwriteResolutions, setDistributionRuntimeOverwriteResolutions] =
    useState<Record<string, boolean>>({});
  const [distributionExecutionItemStatuses, setDistributionExecutionItemStatuses] = useState<
    Record<string, DistributionExecutionItemStatus>
  >({});
  const [pendingDistribution, setPendingDistribution] = useState<PendingDistribution | null>(null);
  const [pendingTargetRemoval, setPendingTargetRemoval] = useState<PendingTargetRemoval | null>(
    null
  );
  const [query, setQuery] = useState("");
  const [repositoryFilter, setRepositoryFilter] = useState<SkillRepositoryFilter>("all");
  const [isDistributionExecuting, setIsDistributionExecuting] = useState(false);
  const [isDistributionPreviewLoading, setIsDistributionPreviewLoading] = useState(false);
  const [isTargetRemovalExecuting, setIsTargetRemovalExecuting] = useState(false);
  const skills = useDataStore((state) => state.skills);
  const registeredTargets = useDataStore((state) => state.registeredTargets);
  const targetOptions = useMemo(() => {
    return registeredTargets.filter((target) => target.enabled).map(adaptTargetOption);
  }, [registeredTargets]);
  const [selectedSkillId, setSelectedSkillId] = useState<string | null>(null);
  const [sort, setSort] = useState<SkillSort>("name");

  const clearDistributionExecutionTimers = () => {
    distributionExecutionTimerIdsRef.current.forEach((timerId) => window.clearTimeout(timerId));
    distributionExecutionTimerIdsRef.current = [];
  };

  useEffect(() => {
    void useDataStore.getState().loadSharedPageData();
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

  const selectedSkill =
    visibleSkills.find((skill) => skill.id === selectedSkillId) ?? visibleSkills[0] ?? null;
  const selectedSkillTargetOptions = useMemo(() => {
    return getTargetOptionsForSkill(targetOptions, selectedSkill);
  }, [selectedSkill, targetOptions]);
  const addTargetDialog = useTargetAddDialogState<TargetsListResult>({
    isSaveAvailable: () =>
      Boolean(selectedSkill) && Boolean(window.skillsManager?.addSkillDirectoryTarget),
    onSaved: (result) => {
      if (!selectedSkill) {
        return;
      }

      applySkillTargetsResult(result, {
        existingTargetIds: selectedSkill.targets,
        skillId: selectedSkill.id
      });
    },
    saveTarget: async (input) => {
      const addSkillDirectoryTarget = window.skillsManager?.addSkillDirectoryTarget;

      if (!selectedSkill || !addSkillDirectoryTarget) {
        throw new Error("unavailable");
      }

      return addSkillDirectoryTarget({
        name: input.name,
        skillUnitId: selectedSkill.id,
        targetPath: input.targetPath
      });
    }
  });
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
    setDistributionNoticeDismissed(false);
  };

  const dismissDistributionNotice = useCallback(() => {
    setDistributionNoticeDismissed(true);
  }, []);

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
    setDistributionRuntimeOverwriteResolutions({});
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
    setDistributionExecutionItemStatuses({});
    setDistributionRuntimeOverwriteResolutions({});
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

  const setDistributionRuntimeOverwriteResolution = (previewItemId: string, overwrite: boolean) => {
    setDistributionRuntimeOverwriteResolutions((currentResolutions) => ({
      ...currentResolutions,
      [previewItemId]: overwrite
    }));
  };

  const executeCurrentDistribution = async () => {
    const executeDistribution = window.skillsManager?.executeDistribution;

    if (isDistributionExecuting) {
      return;
    }

    if (!distributionPreview || !pendingDistribution || !executeDistribution) {
      showDistributionNotice("skills.actions.distributionUnavailableStatus");
      return;
    }

    setIsDistributionExecuting(true);
    setDistributionExecuteResult(null);
    setDistributionNoticeKey(null);
    clearDistributionExecutionTimers();

    const startedAt = Date.now();
    const previewItems = distributionPreview.items;

    setDistributionExecutionItemStatuses(
      createLoadingDistributionExecutionItemStatuses(previewItems)
    );

    try {
      const result = await executeDistribution({
        conflictResolutions: createDistributionExecuteConflictResolutions({
          previewConflictResolutions: distributionConflictResolutions,
          previewItems: distributionPreview.items,
          runtimeOverwriteResolutions: distributionRuntimeOverwriteResolutions
        }),
        skillUnitIds: pendingDistribution.skillUnitIds,
        triggerSource: pendingDistribution.triggerSource
      });

      scheduleDistributionExecutionCompletion({
        getResultStatuses: () =>
          createResultDistributionExecutionItemStatuses(previewItems, result.items),
        onFinish: () => {
          setDistributionExecuteResult(result);
          setDistributionNoticeDismissed(false);
        },
        previewItems,
        startedAt
      });
    } catch (error) {
      scheduleDistributionExecutionCompletion({
        getResultStatuses: () =>
          createFailedDistributionExecutionItemStatuses(
            previewItems,
            stringifyDistributionError(error)
          ),
        onFinish: () => showDistributionNotice("skills.actions.distributionFailedStatus"),
        previewItems,
        startedAt
      });
    }
  };

  const scheduleDistributionExecutionCompletion = ({
    getResultStatuses,
    onFinish,
    previewItems,
    startedAt
  }: {
    getResultStatuses: () => Record<string, DistributionExecutionItemStatus>;
    onFinish: () => void;
    previewItems: DistributionPreviewResult["items"];
    startedAt: number;
  }) => {
    const elapsedMs = Date.now() - startedAt;
    const completeDelayMs = Math.max(0, MIN_DISTRIBUTION_ITEM_LOADING_MS - elapsedMs);
    const finishDelayMs = Math.max(0, MIN_DISTRIBUTION_DIALOG_OPEN_MS - elapsedMs);

    const completeTimerId = window.setTimeout(() => {
      setDistributionExecutionItemStatuses(getResultStatuses());
    }, completeDelayMs);
    const finishTimerId = window.setTimeout(() => {
      setDistributionExecutionItemStatuses((currentStatuses) => {
        if (previewItems.every((item) => currentStatuses[item.id]?.status !== "loading")) {
          return currentStatuses;
        }

        return getResultStatuses();
      });
      onFinish();
      setIsDistributionExecuting(false);
    }, finishDelayMs);

    distributionExecutionTimerIdsRef.current.push(completeTimerId, finishTimerId);
  };

  const toggleSkillTargetPreference = async (skillId: string, targetId: string, enabled: boolean) => {
    if (!enabled) {
      const skill = skills.find((currentSkill) => currentSkill.id === skillId);
      const target = targetOptions.find((currentTarget) => currentTarget.id === targetId);

      if (!skill || !target) {
        return;
      }

      setPendingTargetRemoval({
        skillId,
        skillName: skill.name,
        targetId,
        targetName: target.name,
        targetPath: target.path,
        targetScope: target.scope
      });
      return;
    }

    const store = useDataStore.getState();
    // 乐观写本地；IPC 失败则回滚并提示，避免 UI 勾选态与真实状态不符（R27）。
    store.toggleSkillTargetPreferenceLocally(skillId, targetId, enabled);

    try {
      await window.skillsManager?.setSkillTargetPreference?.({
        agentTargetId: targetId,
        enabled,
        skillUnitId: skillId
      });
    } catch {
      store.toggleSkillTargetPreferenceLocally(skillId, targetId, !enabled);
      showDistributionNotice("skills.actions.targetPreferenceSyncFailedStatus");
    }
  };

  const closeTargetRemovalDialog = () => {
    if (isTargetRemovalExecuting) {
      return;
    }

    setPendingTargetRemoval(null);
  };

  const confirmTargetRemoval = async ({
    deleteInstalledFiles,
    removeTargetPreference
  }: {
    deleteInstalledFiles: boolean;
    removeTargetPreference: boolean;
  }) => {
    if (!pendingTargetRemoval || isTargetRemovalExecuting) {
      return;
    }

    const removeSkillTargetPreference = window.skillsManager?.removeSkillTargetPreference;

    if (!removeSkillTargetPreference) {
      showDistributionNotice("skills.actions.targetRemovalUnavailableStatus");
      setPendingTargetRemoval(null);
      return;
    }

    setIsTargetRemovalExecuting(true);
    setDistributionNoticeKey(null);

    try {
      await removeSkillTargetPreference({
        agentTargetId: pendingTargetRemoval.targetId,
        deleteInstalledFiles,
        removeTargetPreference,
        skillUnitId: pendingTargetRemoval.skillId
      });
      removeSkillTargetLocally({
        removeTargetPreference,
        skillId: pendingTargetRemoval.skillId,
        targetId: pendingTargetRemoval.targetId
      });
      setPendingTargetRemoval(null);
    } catch {
      showDistributionNotice("skills.actions.targetRemovalFailedStatus");
    } finally {
      setIsTargetRemovalExecuting(false);
    }
  };

  const removeSkillTargetLocally = ({
    removeTargetPreference,
    skillId,
    targetId
  }: {
    removeTargetPreference: boolean;
    skillId: string;
    targetId: string;
  }) => {
    useDataStore.getState().removeSkillTargetLocally({ removeTargetPreference, skillId, targetId });
  };

  const applySkillTargetsResult = (
    result: TargetsListResult | undefined,
    {
      existingTargetIds,
      skillId
    }: {
      existingTargetIds: string[];
      skillId: string;
    }
  ) => {
    useDataStore.getState().applySkillTargetsResult(result, { existingTargetIds, skillId });
  };

  const addSyncTargetForSelectedSkill = () => {
    if (!selectedSkill) {
      return;
    }

    addTargetDialog.openAddTargetDialog();
  };

  return {
    checkedDistributionState,
    checkedCount,
    checkedIds,
    addTargetDialog,
    distributionConflictResolutions,
    distributionConfirmDialogOpen,
    distributionExecutionItemStatuses,
    distributionExecuteResult,
    distributionNoticeKey,
    distributionNoticeVisible:
      Boolean(distributionNoticeKey || distributionExecuteResult) && !distributionNoticeDismissed,
    distributionPreview,
    distributionRuntimeOverwriteResolutions,
    isDistributionExecuting,
    isDistributionPreviewLoading,
    isTargetRemovalExecuting,
    pendingTargetRemoval,
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
    closeTargetRemovalDialog,
    dismissDistributionNotice,
    confirmTargetRemoval,
    executeCurrentDistribution,
    selectAllVisible,
    setDistributionConflictResolution,
    setDistributionRuntimeOverwriteResolution,
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

type DistributionConflictResolution = NonNullable<
  DistributionPreviewResult["items"][number]["defaultResolution"]
>;
type DistributionExecuteConflictResolution = NonNullable<
  DistributionExecuteInput["conflictResolutions"]
>[number];

type PendingDistribution = {
  skillUnitIds: string[];
  triggerSource: DistributionPreviewInput["triggerSource"];
};

type PendingTargetRemoval = {
  skillId: string;
  skillName: string;
  targetId: string;
  targetName: string;
  targetPath: string;
  targetScope: TargetOption["scope"];
};

type DistributionExecuteItemResult = DistributionExecuteResult["items"][number];

type DistributionExecutionItemStatus =
  | {
      errorMessage: null;
      result: null;
      status: "loading";
    }
  | {
      errorMessage: string | null;
      result: DistributionExecuteItemResult["result"];
      status: "result";
    };

const MIN_DISTRIBUTION_ITEM_LOADING_MS = 1000;
const MIN_DISTRIBUTION_DIALOG_OPEN_MS = 2000;

const createLoadingDistributionExecutionItemStatuses = (
  items: DistributionPreviewResult["items"]
): Record<string, DistributionExecutionItemStatus> => {
  return Object.fromEntries(
    items.map((item) => [
      item.id,
      {
        errorMessage: null,
        result: null,
        status: "loading"
      }
    ])
  );
};

const createResultDistributionExecutionItemStatuses = (
  previewItems: DistributionPreviewResult["items"],
  resultItems: DistributionExecuteItemResult[]
): Record<string, DistributionExecutionItemStatus> => {
  const resultItemsByKey = new Map(
    resultItems.map((item) => [createDistributionResultItemKey(item), item])
  );

  return Object.fromEntries(
    previewItems.map((previewItem, index) => {
      const resultItem =
        resultItems[index] ?? resultItemsByKey.get(createDistributionResultItemKey(previewItem));

      return [
        previewItem.id,
        resultItem
          ? {
              errorMessage: resultItem.errorMessage,
              result: resultItem.result,
              status: "result"
            }
          : {
              errorMessage: "Distribution result is missing.",
              result: "failed",
              status: "result"
            }
      ];
    })
  );
};

const createFailedDistributionExecutionItemStatuses = (
  previewItems: DistributionPreviewResult["items"],
  errorMessage: string
): Record<string, DistributionExecutionItemStatus> => {
  return Object.fromEntries(
    previewItems.map((item) => [
      item.id,
      {
        errorMessage,
        result: "failed",
        status: "result"
      }
    ])
  );
};

const createDistributionResultItemKey = ({
  agentTargetId,
  skillUnitId,
  targetPath
}: Pick<DistributionExecuteItemResult, "agentTargetId" | "skillUnitId" | "targetPath">): string => {
  return `${skillUnitId}\u0000${agentTargetId}\u0000${targetPath}`;
};

const createDistributionExecuteConflictResolutions = ({
  previewConflictResolutions,
  previewItems,
  runtimeOverwriteResolutions
}: {
  previewConflictResolutions: Record<string, DistributionConflictResolution>;
  previewItems: DistributionPreviewResult["items"];
  runtimeOverwriteResolutions: Record<string, boolean>;
}): DistributionExecuteConflictResolution[] => {
  const resolutionsByPreviewItemId = new Map<string, DistributionExecuteConflictResolution>();

  previewItems.forEach((item) => {
    if (item.action === "conflict") {
      resolutionsByPreviewItemId.set(
        item.id,
        createDistributionExecuteConflictResolution(
          item,
          previewConflictResolutions[item.id] ?? item.defaultResolution ?? "overwrite"
        )
      );
    }

    if (runtimeOverwriteResolutions[item.id]) {
      resolutionsByPreviewItemId.set(
        item.id,
        createDistributionExecuteConflictResolution(item, "overwrite")
      );
    }
  });

  return Array.from(resolutionsByPreviewItemId.values());
};

const createDistributionExecuteConflictResolution = (
  item: DistributionPreviewResult["items"][number],
  resolution: DistributionConflictResolution
): DistributionExecuteConflictResolution => {
  return {
    agentTargetId: item.agentTargetId,
    previewItemId: item.id,
    resolution,
    skillUnitId: item.skillUnitId,
    targetPath: item.targetPath
  };
};

const stringifyDistributionError = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  try {
    return JSON.stringify(error);
  } catch {
    return "Distribution failed.";
  }
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
