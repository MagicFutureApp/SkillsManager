import { useEffect, useMemo, useState } from "react";

import {
  adaptTargets,
  filterTargets,
  type TargetIssue,
  type TargetSort,
  type TargetViewModel
} from "../components/targets-page-data";
import type { RegisteredTargetRecord } from "../../../../core/targets/target-api";
import type { TargetDirectoryAgentOption, TargetsListResult } from "@/global";
import { useDataStore } from "@/stores/data-store";
import {
  clampPageNumber,
  createPaginationState,
  DEFAULT_PAGE_SIZE,
  getPagedItems,
  type PaginationState
} from "@/lib/pagination";
import {
  createEditableTargetAgentDirectory,
  customTargetAgentType,
  deriveTargetNameFromPath,
  joinTargetPathSegments,
  normalizeCustomTargetAgentDirectoryName,
  useTargetAddDialogState,
  type PendingTargetAgentDirectory
} from "./use-target-add-dialog-state";

type TargetsResultLike = {
  registeredTargets?: RegisteredTargetRecord[];
  scanIssues?: TargetIssue[];
};

const minimumRescanLoadingMs = 2000;

export const useTargetsPageState = () => {
  const [checkedIds, setCheckedIds] = useState<Set<string>>(() => new Set());
  const [deleteError, setDeleteError] = useState("");
  const [editTargetError, setEditTargetError] = useState("");
  const [editTargetId, setEditTargetId] = useState<string | null>(null);
  const [editTargetName, setEditTargetName] = useState("");
  const [editTargetPath, setEditTargetPath] = useState("");
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeletingTargets, setIsDeletingTargets] = useState(false);
  const [isEditTargetDialogOpen, setIsEditTargetDialogOpen] = useState(false);
  const [isSavingEditTarget, setIsSavingEditTarget] = useState(false);
  const [isConvertDialogOpen, setIsConvertDialogOpen] = useState(false);
  const [isConvertingTarget, setIsConvertingTarget] = useState(false);
  const [convertTargetError, setConvertTargetError] = useState("");
  const [pendingConvertTargetId, setPendingConvertTargetId] = useState<string | null>(null);
  const [isConvertSuccess, setIsConvertSuccess] = useState(false);
  const [convertedSkillCount, setConvertedSkillCount] = useState(0);
  const [customTargetAgentDirectoryName, setCustomTargetAgentDirectoryNameValue] = useState("");
  const [pendingTargetAgentDirectory, setPendingTargetAgentDirectory] =
    useState<PendingTargetAgentDirectory | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [query, setQuery] = useState("");
  const [hasLoadedTargets, setHasLoadedTargets] = useState(false);
  const [isRefreshingTargets, setIsRefreshingTargets] = useState(false);
  const [pendingDeleteTargetIds, setPendingDeleteTargetIds] = useState<string[]>([]);
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);
  const [scanIssues, setScanIssues] = useState<TargetIssue[]>([]);
  const [selectedTargetAgentType, setSelectedTargetAgentType] = useState<string | null>(null);
  const [sort, setSort] = useState<TargetSort>("name");
  const registeredTargets = useDataStore((state) => state.registeredTargets);
  const targets = useMemo(() => adaptTargets({ registeredTargets }), [registeredTargets]);

  const applyTargetsResult = (result?: TargetsResultLike, preferredTargetId?: string | null) => {
    // 与写桶解耦：无论 result 是否为空都先标记「目标已加载完成」，避免早退分支跳过置位、
    // 导致界面在首次加载拿到空结果时卡在加载态（R16）。result 为空时的写桶保护仍保留在下方早退。
    setHasLoadedTargets(true);

    // 防御：result 为空时若直接写桶会把共享桶的目标写空、并连带 prune 掉所有 skill.targets
    // （测试 mock 不全时尤甚）。无数据时早退，不污染全局状态（R11）。
    if (!result) {
      return;
    }

    // 单一数据源：先把 IPC 结果写入共享桶，本地校验再读桶里派生出的 registeredTargets，
    // 避免「入参 result 做校验」与「页面渲染读 store」分叉（P1-4）。
    useDataStore.getState().setRegisteredTargets(result?.registeredTargets ?? []);
    const nextTargets = adaptTargets({
      registeredTargets: useDataStore.getState().registeredTargets
    });
    const nextTargetIds = new Set(nextTargets.map((target) => target.id));

    setCheckedIds((currentIds) => {
      const nextIds = new Set<string>();

      currentIds.forEach((targetId) => {
        const target = nextTargets.find((item) => item.id === targetId);

        if (target?.deletable) {
          nextIds.add(targetId);
        }
      });

      return nextIds;
    });
    setSelectedTargetId((currentTargetId) => {
      if (preferredTargetId && nextTargets.some((target) => target.id === preferredTargetId)) {
        return preferredTargetId;
      }

      if (currentTargetId && nextTargets.some((target) => target.id === currentTargetId)) {
        return currentTargetId;
      }

      return nextTargets[0]?.id ?? null;
    });
    setPendingDeleteTargetIds((currentIds) =>
      currentIds.filter((targetId) => nextTargetIds.has(targetId))
    );
  };

  const addTargetDialog = useTargetAddDialogState<TargetsListResult>({
    isSaveAvailable: () => Boolean(window.skillsManager?.addCustomDirectoryTarget),
    onSaved: (result, input) => {
      const addedTarget = result?.registeredTargets.find(
        (target) => target.path === input.targetPath
      );

      applyTargetsResult(result, addedTarget?.id);
    },
    saveTarget: async (input) => {
      const addCustomDirectoryTarget = window.skillsManager?.addCustomDirectoryTarget;

      if (!addCustomDirectoryTarget) {
        throw new Error("unavailable");
      }

      return addCustomDirectoryTarget(input);
    }
  });

  const refreshTargets = async () => {
    if (isRefreshingTargets) {
      return;
    }

    setIsRefreshingTargets(true);
    const loadingStartedAt = Date.now();
    let nextScanIssues: TargetIssue[] = [];

    try {
      const rescanResult = await window.skillsManager?.rescanTargets?.();
      const result: TargetsResultLike | undefined =
        rescanResult ?? (await window.skillsManager?.listTargets?.());

      applyTargetsResult(result);
      // pruneSkillTargets 是「写时裁剪」、只删不补：target 因扫描状态（path-missing 等）变为 enabled=false
      // 时被剥掉的 id，需靠 listSkills 重拉才能加回。rescan 只重拉 listTargets、不重拉 listSkills，
      // 故这里补一次 refreshSkills() 仅重供货 skill.targets，不覆盖刚 rescan 得到的 registeredTargets（R10②）。
      void useDataStore.getState().refreshSkills();
      nextScanIssues = rescanResult?.scanIssues ?? [];
    } finally {
      await waitForMinimumElapsedTime(loadingStartedAt, minimumRescanLoadingMs);
      setIsRefreshingTargets(false);
      setScanIssues(nextScanIssues);
    }
  };

  const setPendingEditTargetName = (name: string) => {
    setEditTargetName(name);
  };

  const applyResolvedEditTargetPath = (targetPath: string) => {
    setEditTargetPath(targetPath);
    setEditTargetError("");
    setEditTargetName((currentName) => {
      if (currentName.trim()) {
        return currentName;
      }

      return deriveTargetNameFromPath(targetPath);
    });
  };

  const applyEditCustomTargetAgentDirectoryName = (
    directoryName: string,
    pendingDirectory: PendingTargetAgentDirectory | null = pendingTargetAgentDirectory
  ) => {
    if (!pendingDirectory) {
      return;
    }

    const normalizedDirectoryName = normalizeCustomTargetAgentDirectoryName(directoryName);

    setEditTargetError("");

    if (!normalizedDirectoryName) {
      setEditTargetPath(pendingDirectory.basePath);
      return;
    }

    applyResolvedEditTargetPath(
      joinTargetPathSegments(pendingDirectory.basePath, normalizedDirectoryName, "skills")
    );
  };

  const selectEditCustomTargetAgentDirectoryOption = () => {
    setSelectedTargetAgentType(customTargetAgentType);
    applyEditCustomTargetAgentDirectoryName(customTargetAgentDirectoryName);
  };

  const selectEditTargetPath = async () => {
    const selectedPath = await window.skillsManager?.selectTargetDirectory?.();

    if (!selectedPath) {
      return;
    }

    if (!window.skillsManager?.resolveSelectedTargetDirectory) {
      setPendingTargetAgentDirectory(null);
      setSelectedTargetAgentType(null);
      setCustomTargetAgentDirectoryNameValue("");
      applyResolvedEditTargetPath(selectedPath);
      return;
    }

    const resolution = await window.skillsManager.resolveSelectedTargetDirectory(selectedPath);

    if (resolution.status === "resolved") {
      setPendingTargetAgentDirectory(null);
      setSelectedTargetAgentType(null);
      setCustomTargetAgentDirectoryNameValue("");
      applyResolvedEditTargetPath(resolution.targetPath);
      return;
    }

    setPendingTargetAgentDirectory({
      basePath: resolution.basePath,
      options: resolution.options
    });
    setSelectedTargetAgentType(resolution.selectedAgentType ?? null);
    setCustomTargetAgentDirectoryNameValue(resolution.customDirectoryName ?? "");
    setEditTargetPath(resolution.targetPath ?? resolution.basePath);
    setEditTargetError("");
    setEditTargetName((currentName) => {
      if (currentName.trim()) {
        return currentName;
      }

      return deriveTargetNameFromPath(
        resolution.targetPath ?? resolution.options[0]?.targetPath ?? resolution.basePath
      );
    });
  };

  const selectEditTargetAgentDirectoryOption = (option: TargetDirectoryAgentOption) => {
    setSelectedTargetAgentType(option.type);
    applyResolvedEditTargetPath(option.targetPath);
  };

  const setEditCustomTargetAgentDirectoryName = (directoryName: string) => {
    setCustomTargetAgentDirectoryNameValue(directoryName);
    setSelectedTargetAgentType(customTargetAgentType);
    applyEditCustomTargetAgentDirectoryName(directoryName);
  };

  const toggleTargetChecked = (targetId: string, checked: boolean) => {
    const target = targets.find((item) => item.id === targetId);

    if (!target?.deletable) {
      return;
    }

    if (checked) {
      setSelectedTargetId(targetId);
    }

    setCheckedIds((currentIds) => {
      const nextIds = new Set(currentIds);

      if (checked) {
        nextIds.add(targetId);
      } else {
        nextIds.delete(targetId);
      }

      return nextIds;
    });
  };

  const selectAllVisibleDeletable = (checked: boolean) => {
    setCheckedIds((currentIds) => {
      const nextIds = new Set(currentIds);

      visibleTargets.forEach((target) => {
        if (!target.deletable) {
          return;
        }

        if (checked) {
          nextIds.add(target.id);
        } else {
          nextIds.delete(target.id);
        }
      });

      return nextIds;
    });
  };

  const openDeleteDialog = (targetIds: string[]) => {
    const normalizedTargetIds = normalizeTargetIds(targetIds);
    const deletableTargetIds = normalizedTargetIds.filter((targetId) => {
      return targets.some((target) => target.id === targetId && target.deletable);
    });

    if (!deletableTargetIds.length) {
      return;
    }

    setDeleteError("");
    setPendingDeleteTargetIds(deletableTargetIds);
    setIsDeleteDialogOpen(true);
  };

  const openCheckedDeleteDialog = () => {
    openDeleteDialog(Array.from(checkedIds));
  };

  const closeDeleteDialog = () => {
    if (isDeletingTargets) {
      return;
    }

    setDeleteError("");
    setIsDeleteDialogOpen(false);
    setPendingDeleteTargetIds([]);
  };

  const openEditTargetDialog = (target: TargetViewModel) => {
    if (!target.deletable) {
      return;
    }

    setEditTargetError("");
    setEditTargetId(target.id);
    setEditTargetName(target.name);
    setEditTargetPath(target.path);
    const editableTargetDirectory = createEditableTargetAgentDirectory(target.path);

    setCustomTargetAgentDirectoryNameValue(editableTargetDirectory.customDirectoryName);
    setPendingTargetAgentDirectory({
      basePath: editableTargetDirectory.basePath,
      options: editableTargetDirectory.options
    });
    setSelectedTargetAgentType(editableTargetDirectory.selectedAgentType);
    setIsEditTargetDialogOpen(true);
  };

  const closeEditTargetDialog = () => {
    if (isSavingEditTarget) {
      return;
    }

    setEditTargetError("");
    setCustomTargetAgentDirectoryNameValue("");
    setPendingTargetAgentDirectory(null);
    setSelectedTargetAgentType(null);
    setIsEditTargetDialogOpen(false);
  };

  const saveEditTarget = async () => {
    const targetId = editTargetId?.trim() ?? "";
    const name = editTargetName.trim();
    const targetPath = editTargetPath.trim();

    if (
      selectedTargetAgentType === customTargetAgentType &&
      !normalizeCustomTargetAgentDirectoryName(customTargetAgentDirectoryName)
    ) {
      setEditTargetError("customAgentDirectoryRequired");
      return;
    }

    if (!targetId || !name || !targetPath) {
      setEditTargetError("required");
      return;
    }

    if (!window.skillsManager?.updateCustomDirectoryTarget) {
      setEditTargetError("unavailable");
      return;
    }

    setEditTargetError("");
    setIsSavingEditTarget(true);

    try {
      const result = await window.skillsManager.updateCustomDirectoryTarget({
        name,
        targetId,
        targetPath
      });

      applyTargetsResult(result, targetId);
      setIsEditTargetDialogOpen(false);
      setEditTargetId(null);
      setEditTargetName("");
      setEditTargetPath("");
      setCustomTargetAgentDirectoryNameValue("");
      setPendingTargetAgentDirectory(null);
      setSelectedTargetAgentType(null);
    } catch (error) {
      setEditTargetError(error instanceof Error ? error.message : "failed");
    } finally {
      setIsSavingEditTarget(false);
    }
  };

  const confirmDeleteTargets = async ({
    deleteInstalledFiles
  }: {
    deleteInstalledFiles: boolean;
  }) => {
    const targetIds = normalizeTargetIds(pendingDeleteTargetIds);

    if (!targetIds.length) {
      closeDeleteDialog();
      return;
    }

    setDeleteError("");
    setIsDeletingTargets(true);

    try {
      if (!window.skillsManager?.deleteTargets) {
        throw new Error("删除目标接口不可用。");
      }

      const result = await window.skillsManager.deleteTargets({ deleteInstalledFiles, targetIds });

      applyTargetsResult(result);
      setCheckedIds((currentIds) => {
        const nextIds = new Set(currentIds);

        targetIds.forEach((targetId) => nextIds.delete(targetId));

        return nextIds;
      });
      setPendingDeleteTargetIds([]);
      setIsDeleteDialogOpen(false);
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : "删除目标失败。");
    } finally {
      setIsDeletingTargets(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    void useDataStore.getState().loadSharedPageData().then(() => {
      // 初始加载走共享数据桶；这里把桶里的数据灌回页面本地状态（hasLoadedTargets 置真）。
      // 初始选中规则：优先选中 store 顺序首个 target（registeredTargets[0]）。
      // 注意：loadSharedPageData 内的 zustand store.set 会先触发一次重渲染，
      // 此时 selectedTargetId 仍为 null 而 visibleTargets 已就绪，下方「可见性归一化」effect
      // 会把选中改成 visibleTargets[0]（按当前 sort 排序后的首个，未必是 registeredTargets[0]）。
      // 因此这里必须显式传 preferredTargetId = registeredTargets[0]?.id，
      // 由 applyTargetsResult 的 preferredTargetId 分支强制锚定初始选中，覆盖 effect 的归一化结果。
      // （R3 复审曾误判 preferredTargetId 为死参数并建议删除，实测删除后初始选中回归为排序首个 target；保留之。）
      if (!isMounted) {
        return;
      }
      const { registeredTargets, status } = useDataStore.getState();
      // 仅当「目标侧也加载失败、桶内 registeredTargets 为空」时才跳过写回，避免 setRegisteredTargets([])
      // 把 skills[].targets 剪空（R34）；若只是 skills 侧失败而目标已加载（loadSharedPageData 在失败侧
      // 保留桶内目标），仍应把目标灌回页面并锚定初始选中。错误态重试由 AppShell 错误条统一提供。
      if (registeredTargets.length === 0 && status !== "ready") {
        setHasLoadedTargets(true);
        return;
      }
      applyTargetsResult({ registeredTargets }, registeredTargets[0]?.id);
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const openConvertDialog = (targetId: string) => {
    if (!targets.some((target) => target.id === targetId && target.deletable)) {
      return;
    }

    setConvertTargetError("");
    setPendingConvertTargetId(targetId);
    setIsConvertDialogOpen(true);
  };

  const closeConvertDialog = () => {
    if (isConvertingTarget) {
      return;
    }

    setConvertTargetError("");
    setIsConvertDialogOpen(false);
    setPendingConvertTargetId(null);
  };

  const convertTargetToGlobal = async () => {
    const targetId = pendingConvertTargetId;

    if (!targetId) {
      closeConvertDialog();
      return;
    }

    const target = targets.find((item) => item.id === targetId);

    if (!target || !window.skillsManager?.convertTargetToGlobal) {
      setConvertTargetError("转为全局暂不可用。");
      return;
    }

    setConvertTargetError("");
    setIsConvertingTarget(true);

    try {
      const result = await window.skillsManager.convertTargetToGlobal({ targetId });

      applyTargetsResult(result, targetId);
      setConvertedSkillCount(target.skillCount ?? 0);
      setIsConvertSuccess(true);
    } catch (error) {
      setConvertTargetError(error instanceof Error ? error.message : "转为全局失败。");
    } finally {
      setIsConvertingTarget(false);
    }
  };

  const filteredTargets = useMemo(() => {
    return filterTargets({ query, sort, targets });
  }, [query, sort, targets]);
  const pagination = useMemo<PaginationState>(() => {
    return createPaginationState({
      currentPage,
      pageSize: DEFAULT_PAGE_SIZE,
      totalItems: filteredTargets.length
    });
  }, [currentPage, filteredTargets.length]);
  const visibleTargets = useMemo(() => {
    return getPagedItems(filteredTargets, pagination);
  }, [filteredTargets, pagination]);

  useEffect(() => {
    setCurrentPage(1);
  }, [query, sort]);

  useEffect(() => {
    setCurrentPage((current) => clampPageNumber(current, pagination.totalPages));
  }, [pagination.totalPages]);

  useEffect(() => {
    if (!visibleTargets.length) {
      setSelectedTargetId(null);
      return;
    }

    setSelectedTargetId((currentTargetId) => {
      if (currentTargetId && visibleTargets.some((target) => target.id === currentTargetId)) {
        return currentTargetId;
      }

      return visibleTargets[0]?.id ?? null;
    });
  }, [visibleTargets]);

  const selectedTarget = visibleTargets.find((target) => target.id === selectedTargetId) ?? null;
  const visibleDeletableTargets = visibleTargets.filter((target) => target.deletable);
  const visibleDeletableIds = visibleDeletableTargets.map((target) => target.id);
  const visibleCheckedCount = visibleDeletableIds.filter((id) => checkedIds.has(id)).length;
  const visibleAllChecked =
    visibleDeletableTargets.length > 0 && visibleCheckedCount === visibleDeletableTargets.length;
  const visibleSomeChecked = visibleCheckedCount > 0;
  const checkedCount = checkedIds.size;
  const pendingDeleteTargets = pendingDeleteTargetIds
    .map((targetId) => targets.find((target) => target.id === targetId))
    .filter((target): target is TargetViewModel => Boolean(target));
  const pendingConvertTarget =
    (pendingConvertTargetId &&
      (targets.find((target) => target.id === pendingConvertTargetId) ?? null)) ||
    null;
  const copySelectedTargetPath = () => {
    if (!selectedTarget) {
      return;
    }

    void navigator.clipboard?.writeText(selectedTarget.path);
  };

  const setTargetsPage = (pageNumber: number) => {
    setCurrentPage(clampPageNumber(pageNumber, pagination.totalPages));
  };

  return {
    addTargetDialog,
    checkedCount,
    checkedIds,
    deleteError,
    editTargetError,
    editTargetName,
    editTargetPath,
    hasLoadedTargets,
    isDeleteDialogOpen,
    isDeletingTargets,
    isEditTargetDialogOpen,
    isConvertDialogOpen,
    isConvertingTarget,
    isConvertSuccess,
    convertedSkillCount,
    isCustomTargetAgentDirectorySelected: selectedTargetAgentType === customTargetAgentType,
    isRefreshingTargets,
    isSavingEditTarget,
    customTargetAgentDirectoryName,
    pendingTargetAgentDirectory,
    pendingDeleteTargets,
    pendingConvertTarget,
    pagination,
    query,
    scanIssues,
    selectedTarget,
    selectedTargetAgentType,
    selectedTargetId,
    sort,
    targets,
    visibleAllChecked,
    visibleTargets,
    visibleSomeChecked,
    closeDeleteDialog,
    closeEditTargetDialog,
    closeConvertDialog,
    convertTargetError,
    convertTargetToGlobal,
    copySelectedTargetPath,
    confirmDeleteTargets,
    openAddTargetDialog: addTargetDialog.openAddTargetDialog,
    openCheckedDeleteDialog,
    openConvertDialog,
    openDeleteDialog,
    openEditTargetDialog,
    refreshTargets,
    saveEditTarget,
    selectAllVisibleDeletable,
    selectEditCustomTargetAgentDirectoryOption,
    selectEditTargetAgentDirectoryOption,
    selectEditTargetPath,
    setTargetsPage,
    setEditCustomTargetAgentDirectoryName,
    setEditTargetName: setPendingEditTargetName,
    setScanIssues,
    setQuery,
    setSelectedTargetId,
    setSort,
    toggleTargetChecked
  };
};

export type TargetsPageState = ReturnType<typeof useTargetsPageState>;

const waitForMinimumElapsedTime = async (startedAt: number, minimumMs: number): Promise<void> => {
  const remainingMs = minimumMs - (Date.now() - startedAt);

  if (remainingMs <= 0) {
    return;
  }

  await new Promise((resolve) => setTimeout(resolve, remainingMs));
};

const normalizeTargetIds = (targetIds: string[]): string[] => {
  return Array.from(new Set(targetIds.map((targetId) => targetId.trim()).filter(Boolean)));
};
