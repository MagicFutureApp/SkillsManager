import { useEffect, useMemo, useState } from "react";

import {
  adaptTargets,
  filterTargets,
  type TargetIssue,
  type TargetSort,
  type TargetViewModel
} from "../components/targets-page-data";
import type { RegisteredTargetRecord } from "../../../../core/targets/target-api";
import type { TargetDirectoryAgentOption } from "@/global";
import {
  clampPageNumber,
  createPaginationState,
  DEFAULT_PAGE_SIZE,
  getPagedItems,
  type PaginationState
} from "@/lib/pagination";

type TargetsResultLike = {
  registeredTargets?: RegisteredTargetRecord[];
  scanIssues?: TargetIssue[];
};

type PendingTargetAgentDirectory = {
  basePath: string;
  options: TargetDirectoryAgentOption[];
};

const minimumRescanLoadingMs = 2000;

export const useTargetsPageState = () => {
  const [checkedIds, setCheckedIds] = useState<Set<string>>(() => new Set());
  const [addTargetError, setAddTargetError] = useState("");
  const [addTargetName, setAddTargetName] = useState("");
  const [addTargetPath, setAddTargetPath] = useState("");
  const [isAddTargetDialogOpen, setIsAddTargetDialogOpen] = useState(false);
  const [isSavingTarget, setIsSavingTarget] = useState(false);
  const [isTargetNameDirty, setIsTargetNameDirty] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeletingTargets, setIsDeletingTargets] = useState(false);
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

  const openAddTargetDialog = () => {
    setAddTargetError("");
    setAddTargetName("");
    setAddTargetPath("");
    setIsTargetNameDirty(false);
    setPendingTargetAgentDirectory(null);
    setSelectedTargetAgentType(null);
    setIsAddTargetDialogOpen(true);
  };

  const closeAddTargetDialog = () => {
    if (isSavingTarget) {
      return;
    }

    setAddTargetError("");
    setIsAddTargetDialogOpen(false);
  };

  const setPendingTargetName = (name: string) => {
    setIsTargetNameDirty(true);
    setAddTargetName(name);
  };

  const applyResolvedTargetPath = (targetPath: string) => {
    setAddTargetPath(targetPath);
    setAddTargetError("");
    setAddTargetName((currentName) => {
      if (isTargetNameDirty && currentName.trim()) {
        return currentName;
      }

      return deriveTargetNameFromPath(targetPath);
    });
  };

  const selectTargetPath = async () => {
    const selectedPath = await window.skillsManager?.selectTargetDirectory?.();

    if (!selectedPath) {
      return;
    }

    if (!window.skillsManager?.resolveSelectedTargetDirectory) {
      setPendingTargetAgentDirectory(null);
      setSelectedTargetAgentType(null);
      applyResolvedTargetPath(selectedPath);
      return;
    }

    const resolution = await window.skillsManager.resolveSelectedTargetDirectory(selectedPath);

    if (resolution.status === "resolved") {
      setPendingTargetAgentDirectory(null);
      setSelectedTargetAgentType(null);
      applyResolvedTargetPath(resolution.targetPath);
      return;
    }

    setPendingTargetAgentDirectory({
      basePath: resolution.basePath,
      options: resolution.options
    });
    setSelectedTargetAgentType(null);
    setAddTargetPath("");
    setAddTargetError("");
    setAddTargetName((currentName) => {
      if (isTargetNameDirty && currentName.trim()) {
        return currentName;
      }

      return "";
    });
  };

  const selectTargetAgentDirectoryOption = (option: TargetDirectoryAgentOption) => {
    setSelectedTargetAgentType(option.type);
    applyResolvedTargetPath(option.targetPath);
  };

  const saveAddTarget = async () => {
    const name = addTargetName.trim();
    const targetPath = addTargetPath.trim();

    if (!name || !targetPath) {
      setAddTargetError("required");
      return;
    }

    if (!window.skillsManager?.addCustomDirectoryTarget) {
      setAddTargetError("unavailable");
      return;
    }

    setAddTargetError("");
    setIsSavingTarget(true);

    try {
      const result = await window.skillsManager.addCustomDirectoryTarget({
        name,
        targetPath
      });
      const addedTarget = result?.registeredTargets.find((target) => target.path === targetPath);

      applyTargetsResult(result, addedTarget?.id);
      setIsAddTargetDialogOpen(false);
      setAddTargetName("");
      setAddTargetPath("");
      setIsTargetNameDirty(false);
      setPendingTargetAgentDirectory(null);
      setSelectedTargetAgentType(null);
    } catch (error) {
      setAddTargetError(error instanceof Error ? error.message : "failed");
    } finally {
      setIsSavingTarget(false);
    }
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
    addTargetError,
    addTargetName,
    addTargetPath,
    checkedCount,
    checkedIds,
    deleteError,
    hasLoadedTargets,
    isDeleteDialogOpen,
    isDeletingTargets,
    isAddTargetDialogOpen,
    isRefreshingTargets,
    isSavingTarget,
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
    closeAddTargetDialog,
    closeDeleteDialog,
    copySelectedTargetPath,
    confirmDeleteTargets,
    openAddTargetDialog,
    openCheckedDeleteDialog,
    openDeleteDialog,
    refreshTargets,
    saveAddTarget,
    selectAllVisibleDeletable,
    selectTargetAgentDirectoryOption,
    selectTargetPath,
    setTargetsPage,
    setScanIssues,
    setPendingTargetName,
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

const deriveTargetNameFromPath = (targetPath: string): string => {
  const normalizedPath = targetPath.trim().replace(/[\\/]+$/g, "");
  const segments = normalizedPath.split(/[\\/]+/).filter(Boolean);

  return segments.at(-3) ?? segments.at(-1) ?? targetPath.trim();
};
