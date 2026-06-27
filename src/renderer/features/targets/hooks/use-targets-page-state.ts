import { useEffect, useMemo, useState } from "react";

import {
  adaptTargets,
  filterTargets,
  type TargetIssue,
  type TargetSort,
  type TargetViewModel
} from "../components/targets-page-data";
import type { RegisteredTargetRecord } from "../../../../core/targets/target-api";

type TargetsResultLike = {
  registeredTargets?: RegisteredTargetRecord[];
  scanIssues?: TargetIssue[];
};

const minimumRescanLoadingMs = 2000;

export const useTargetsPageState = () => {
  const [checkedIds, setCheckedIds] = useState<Set<string>>(() => new Set());
  const [deleteError, setDeleteError] = useState("");
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeletingTargets, setIsDeletingTargets] = useState(false);
  const [query, setQuery] = useState("");
  const [isRefreshingTargets, setIsRefreshingTargets] = useState(false);
  const [pendingDeleteTargetIds, setPendingDeleteTargetIds] = useState<string[]>([]);
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);
  const [scanIssues, setScanIssues] = useState<TargetIssue[]>([]);
  const [sort, setSort] = useState<TargetSort>("name");
  const [targets, setTargets] = useState<TargetViewModel[]>([]);

  const applyTargetsResult = (result?: TargetsResultLike, preferredTargetId?: string | null) => {
    const nextTargets = adaptTargets({
      registeredTargets: result?.registeredTargets ?? []
    });
    const nextTargetIds = new Set(nextTargets.map((target) => target.id));

    setTargets(nextTargets);
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

  const addTarget = async () => {
    const selectedPath = await window.skillsManager?.selectTargetDirectory?.();

    if (!selectedPath) {
      return;
    }

    const result = await window.skillsManager?.addCustomDirectoryTarget?.(selectedPath);
    const addedTarget = result?.registeredTargets.find((target) => target.path === selectedPath);

    applyTargetsResult(result, addedTarget?.id);
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

  const visibleTargets = useMemo(() => {
    return filterTargets({ query, sort, targets });
  }, [query, sort, targets]);

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

  return {
    checkedCount,
    checkedIds,
    deleteError,
    isDeleteDialogOpen,
    isDeletingTargets,
    isRefreshingTargets,
    pendingDeleteTargets,
    query,
    scanIssues,
    selectedTarget,
    selectedTargetId,
    sort,
    targets,
    visibleAllChecked,
    visibleTargets,
    visibleSomeChecked,
    addTarget,
    closeDeleteDialog,
    confirmDeleteTargets,
    openCheckedDeleteDialog,
    openDeleteDialog,
    refreshTargets,
    selectAllVisibleDeletable,
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
