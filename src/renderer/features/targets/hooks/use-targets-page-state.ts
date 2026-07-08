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
  const [targets, setTargets] = useState<TargetViewModel[]>([]);

  const applyTargetsResult = (result?: TargetsResultLike, preferredTargetId?: string | null) => {
    const nextTargets = adaptTargets({
      registeredTargets: result?.registeredTargets ?? []
    });
    const nextTargetIds = new Set(nextTargets.map((target) => target.id));

    setTargets(nextTargets);
    setHasLoadedTargets(true);
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

  const confirmDeleteTargets = async () => {
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

      const result = await window.skillsManager.deleteTargets({ targetIds });

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

    void window.skillsManager?.listTargets?.().then((result) => {
      if (!isMounted) {
        return;
      }

      applyTargetsResult(result);
    });

    return () => {
      isMounted = false;
    };
  }, []);

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
    isCustomTargetAgentDirectorySelected: selectedTargetAgentType === customTargetAgentType,
    isRefreshingTargets,
    isSavingEditTarget,
    customTargetAgentDirectoryName,
    pendingTargetAgentDirectory,
    pendingDeleteTargets,
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
    copySelectedTargetPath,
    confirmDeleteTargets,
    openAddTargetDialog: addTargetDialog.openAddTargetDialog,
    openCheckedDeleteDialog,
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
