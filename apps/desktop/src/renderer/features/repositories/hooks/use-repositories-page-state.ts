import {
  adaptRepositoryRecords,
  createDefaultRepositories,
  filterRepositories,
  type RepositoryFormValues,
  type RepositoryProviderFilter,
  type RepositorySort,
  type RepositoryStatusFilter,
  type RepositoryViewModel
} from "../components/repository-data";
import type {
  RepositoriesSyncProgressEvent,
  RepositoriesSyncResult,
  RepositoryDeletePreview
} from "@/global";
import {
  clampPageNumber,
  createPaginationState,
  DEFAULT_PAGE_SIZE,
  getPagedItems,
  type PaginationState
} from "@/lib/pagination";
import { useEffect, useMemo, useRef, useState } from "react";

export type RepositorySyncState =
  | {
      message: string;
      status: "syncing";
    }
  | {
      message: string;
      status: "success" | "empty" | "failed";
    };

export type RepositorySyncProgressItem = {
  id: string;
  name: string;
  status: "completed" | "failed" | "syncing";
};

export type RepositorySyncProgressRepository = {
  items: RepositorySyncProgressItem[];
  repositoryId: string;
  repositoryName: string;
};

export type RepositorySyncProgressDialogState = {
  id: number;
  repositories: RepositorySyncProgressRepository[];
  status: "completed" | "failed" | "syncing";
};

const MIN_SYNC_PROGRESS_ITEM_DURATION_MS = 1000;

export const useRepositoriesPageState = () => {
  const [repositories, setRepositories] = useState<RepositoryViewModel[]>(() =>
    createDefaultRepositories()
  );
  const [checkedIds, setCheckedIds] = useState<Set<string>>(() => new Set());
  const [editingRepositoryId, setEditingRepositoryId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [deletePreview, setDeletePreview] = useState<RepositoryDeletePreview | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeletingRepository, setIsDeletingRepository] = useState(false);
  const [isLoadingDeletePreview, setIsLoadingDeletePreview] = useState(false);
  const [isSavingRepository, setIsSavingRepository] = useState(false);
  const [pendingLocalSyncRepositoryIds, setPendingLocalSyncRepositoryIds] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [modalError, setModalError] = useState("");
  const [providerFilter, setProviderFilter] = useState<RepositoryProviderFilter>("all");
  const [query, setQuery] = useState("");
  const [repositorySyncStates, setRepositorySyncStates] = useState<
    Record<string, RepositorySyncState>
  >({});
  const [syncProgressDialog, setSyncProgressDialog] =
    useState<RepositorySyncProgressDialogState | null>(null);
  const progressItemRepositoryIdsRef = useRef<Map<string, string>>(new Map());
  const progressItemStartedAtRef = useRef<Map<string, number>>(new Map());
  const progressItemCompletionTimeoutsRef = useRef<Map<string, number>>(new Map());
  const syncProgressFinishTimeoutRef = useRef<number | null>(null);
  const [selectedRepositoryId, setSelectedRepositoryId] = useState<string | null>(
    () => repositories[0]?.id ?? null
  );
  const [sort, setSort] = useState<RepositorySort>("name");
  const [statusFilter, setStatusFilter] = useState<RepositoryStatusFilter>("all");

  useEffect(() => {
    let isMounted = true;

    void loadRepositories().then((nextRepositories) => {
      if (isMounted) {
        setRepositories(nextRepositories);
        setSelectedRepositoryId(
          (currentRepositoryId) => currentRepositoryId ?? nextRepositories[0]?.id ?? null
        );
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const unsubscribe = window.skillsManager?.onRepositorySyncProgress?.((event) => {
      const itemId = event.skill.skillUnitId;

      progressItemRepositoryIdsRef.current.set(itemId, event.repositoryId);

      if (event.status === "syncing") {
        progressItemStartedAtRef.current.set(itemId, Date.now());
        clearProgressItemCompletionTimeout(itemId, progressItemCompletionTimeoutsRef.current);
        setSyncProgressDialog((currentDialog) => upsertSyncProgressEvent(currentDialog, event));
        return;
      }

      const startedAt = progressItemStartedAtRef.current.get(itemId) ?? Date.now();

      if (!progressItemStartedAtRef.current.has(itemId)) {
        progressItemStartedAtRef.current.set(itemId, startedAt);
        setSyncProgressDialog((currentDialog) =>
          upsertSyncProgressEvent(currentDialog, { ...event, status: "syncing" })
        );
      }

      const remainingDuration = getRemainingSyncProgressDuration(startedAt, Date.now());
      const completeItem = () => {
        progressItemCompletionTimeoutsRef.current.delete(itemId);
        setSyncProgressDialog((currentDialog) => upsertSyncProgressEvent(currentDialog, event));
      };

      clearProgressItemCompletionTimeout(itemId, progressItemCompletionTimeoutsRef.current);

      if (remainingDuration > 0) {
        progressItemCompletionTimeoutsRef.current.set(
          itemId,
          window.setTimeout(completeItem, remainingDuration)
        );
        return;
      }

      completeItem();
    });

    return () => {
      unsubscribe?.();
      clearSyncProgressTimeouts(
        progressItemCompletionTimeoutsRef.current,
        syncProgressFinishTimeoutRef
      );
    };
  }, []);

  useEffect(() => {
    if (syncProgressDialog?.status !== "completed") {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setSyncProgressDialog((currentDialog) =>
        currentDialog?.id === syncProgressDialog.id ? null : currentDialog
      );
    }, 3000);

    return () => window.clearTimeout(timeoutId);
  }, [syncProgressDialog?.id, syncProgressDialog?.status]);

  const filteredRepositories = useMemo(() => {
    return filterRepositories({
      provider: providerFilter,
      query,
      repositories,
      sort,
      status: statusFilter
    });
  }, [providerFilter, query, repositories, sort, statusFilter]);
  const pagination = useMemo<PaginationState>(() => {
    return createPaginationState({
      currentPage,
      pageSize: DEFAULT_PAGE_SIZE,
      totalItems: filteredRepositories.length
    });
  }, [currentPage, filteredRepositories.length]);
  const visibleRepositories = useMemo(() => {
    return getPagedItems(filteredRepositories, pagination);
  }, [filteredRepositories, pagination]);

  useEffect(() => {
    setCurrentPage(1);
  }, [providerFilter, query, sort, statusFilter]);

  useEffect(() => {
    setCurrentPage((current) => clampPageNumber(current, pagination.totalPages));
  }, [pagination.totalPages]);

  useEffect(() => {
    if (!visibleRepositories.length) {
      setSelectedRepositoryId(null);
      return;
    }

    setSelectedRepositoryId((currentRepositoryId) => {
      if (
        currentRepositoryId &&
        visibleRepositories.some((repository) => repository.id === currentRepositoryId)
      ) {
        return currentRepositoryId;
      }

      return visibleRepositories[0]?.id ?? null;
    });
  }, [visibleRepositories]);

  const selectedRepository =
    visibleRepositories.find((repository) => repository.id === selectedRepositoryId) ?? null;
  const editingRepository =
    repositories.find((repository) => repository.id === editingRepositoryId) ?? null;
  const visibleIds = visibleRepositories.map((repository) => repository.id);
  const visibleCheckedCount = visibleIds.filter((id) => checkedIds.has(id)).length;
  const visibleAllChecked =
    visibleRepositories.length > 0 && visibleCheckedCount === visibleRepositories.length;
  const visibleSomeChecked = visibleCheckedCount > 0;
  const hasCheckedRepositories = checkedIds.size > 0;
  const syncingRepositoryIds = useMemo(() => {
    return new Set(
      Object.entries(repositorySyncStates)
        .filter(([, state]) => state.status === "syncing")
        .map(([repositoryId]) => repositoryId)
    );
  }, [repositorySyncStates]);

  const updateRepository = (
    repositoryId: string | null,
    updater: (repository: RepositoryViewModel) => RepositoryViewModel
  ) => {
    if (!repositoryId) {
      return;
    }

    setRepositories((currentRepositories) =>
      currentRepositories.map((repository) =>
        repository.id === repositoryId ? updater(repository) : repository
      )
    );
  };

  const getSyncTargetRepositories = (repositoryIds: string[]) => {
    if (!repositoryIds.length) {
      return [];
    }

    const targetIdSet = new Set(
      repositoryIds.filter((repositoryId) => !syncingRepositoryIds.has(repositoryId))
    );

    if (!targetIdSet.size) {
      return [];
    }

    return repositories.filter((repository) => targetIdSet.has(repository.id));
  };

  const syncRepositoriesByIds = async (repositoryIds: string[]) => {
    const targetRepositories = getSyncTargetRepositories(repositoryIds);

    if (!targetRepositories.length) {
      return;
    }

    const hasLocalPath = targetRepositories.some((repository) => repository.provider === "Local");

    if (hasLocalPath) {
      setPendingLocalSyncRepositoryIds(targetRepositories.map((repository) => repository.id));
      return;
    }

    await executeSyncRepositories(targetRepositories);
  };

  const executeSyncRepositories = async (targetRepositories: RepositoryViewModel[]) => {
    if (!targetRepositories.length) {
      return;
    }

    const targetIdSet = new Set(targetRepositories.map((repository) => repository.id));
    const targetRepositoryIds = targetRepositories.map((repository) => repository.id);
    const nextSelectedRepositoryId = targetIdSet.has(selectedRepositoryId ?? "")
      ? selectedRepositoryId
      : (targetRepositoryIds[0] ?? null);

    clearSyncProgressFinishTimeout(syncProgressFinishTimeoutRef);
    setSyncProgressDialog(createSyncProgressDialog(targetRepositories));
    setRepositorySyncStates((currentStates) => {
      const nextStates = { ...currentStates };

      targetRepositories.forEach((repository) => {
        nextStates[repository.id] = {
          message: buildSyncingMessage(repository),
          status: "syncing"
        };
      });

      return nextStates;
    });

    try {
      if (!window.skillsManager?.syncRepositories) {
        throw new Error("同步来源接口不可用。");
      }

      const syncResult = await window.skillsManager.syncRepositories(targetRepositoryIds);
      const nextRepositories = await loadRepositories();
      const resultByRepositoryId = new Map(
        syncResult.results.map((result) => [result.repositoryId, result])
      );

      setSelectedRepositoryId(nextSelectedRepositoryId);
      setRepositories(nextRepositories);
      finishSyncProgressDialog({
        repositories: nextRepositories,
        repositoryIds: targetRepositoryIds,
        resultByRepositoryId
      });
      setRepositorySyncStates((currentStates) => {
        const nextStates = { ...currentStates };

        targetRepositoryIds.forEach((repositoryId) => {
          const result = resultByRepositoryId.get(repositoryId);

          if (!result) {
            nextStates[repositoryId] = {
              message: "同步完成，但没有返回该来源的扫描结果。",
              status: "empty"
            };
            return;
          }

          if (result.status === "skipped") {
            return;
          }

          if (result.error) {
            nextStates[repositoryId] = {
              message: `同步失败。${result.error.message}`,
              status: "failed"
            };
            return;
          }

          nextStates[repositoryId] = {
            message: buildSyncResultMessage(result),
            status: result.skillUnits > 0 ? "success" : "empty"
          };
        });

        return nextStates;
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "未知错误。";

      setSyncProgressDialog((currentDialog) =>
        failSyncProgressDialog(currentDialog, targetRepositories)
      );
      setRepositorySyncStates((currentStates) => {
        const nextStates = { ...currentStates };

        targetRepositoryIds.forEach((repositoryId) => {
          nextStates[repositoryId] = {
            message: `同步失败。${message}`,
            status: "failed"
          };
        });

        return nextStates;
      });
    }
  };

  const confirmLocalSyncRepositories = async () => {
    const targetRepositories = getSyncTargetRepositories(pendingLocalSyncRepositoryIds);

    setPendingLocalSyncRepositoryIds([]);
    await executeSyncRepositories(targetRepositories);
  };

  const closeLocalSyncConfirmDialog = () => {
    setPendingLocalSyncRepositoryIds([]);
  };

  const closeSyncProgressDialog = () => {
    clearSyncProgressTimeouts(
      progressItemCompletionTimeoutsRef.current,
      syncProgressFinishTimeoutRef
    );
    setSyncProgressDialog(null);
  };

  const finishSyncProgressDialog = ({
    repositories,
    repositoryIds,
    resultByRepositoryId
  }: {
    repositories: RepositoryViewModel[];
    repositoryIds: string[];
    resultByRepositoryId: Map<string, Awaited<RepositoriesSyncResult>["results"][number]>;
  }) => {
    clearSyncProgressFinishTimeout(syncProgressFinishTimeoutRef);

    const remainingDuration = getRemainingSyncProgressDurationForRepositories({
      itemRepositoryIds: progressItemRepositoryIdsRef.current,
      itemStartedAt: progressItemStartedAtRef.current,
      now: Date.now(),
      repositoryIds
    });
    const completeDialog = () => {
      syncProgressFinishTimeoutRef.current = null;
      setSyncProgressDialog((currentDialog) =>
        completeSyncProgressDialog({
          dialog: currentDialog,
          repositories,
          repositoryIds,
          resultByRepositoryId
        })
      );
    };

    if (remainingDuration > 0) {
      syncProgressFinishTimeoutRef.current = window.setTimeout(completeDialog, remainingDuration);
      return;
    }

    completeDialog();
  };

  const syncCheckedRepositories = async () => {
    await syncRepositoriesByIds(Array.from(checkedIds));
  };

  const syncRepository = async (repositoryId: string) => {
    await syncRepositoriesByIds([repositoryId]);
  };

  const toggleRepositoryEnabled = (repositoryId: string) => {
    setSelectedRepositoryId(repositoryId);
    const repository = repositories.find((item) => item.id === repositoryId);

    if (!repository) {
      return;
    }

    const nextEnabled = !repository.enabled;

    updateRepository(repositoryId, (currentRepository) => ({
      ...currentRepository,
      enabled: nextEnabled
    }));

    void persistRepositoryEnabled(repository, nextEnabled)
      .then(loadRepositories)
      .then((nextRepositories) => {
        setRepositories(nextRepositories);
      })
      .catch(() => {
        updateRepository(repositoryId, (currentRepository) => ({
          ...currentRepository,
          enabled: repository.enabled
        }));
      });
  };

  const toggleRepositoryChecked = (repositoryId: string, checked: boolean) => {
    if (checked) {
      setSelectedRepositoryId(repositoryId);
    }

    setCheckedIds((currentIds) => {
      const nextIds = new Set(currentIds);

      if (checked) {
        nextIds.add(repositoryId);
      } else {
        nextIds.delete(repositoryId);
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

  const setRepositoriesPage = (pageNumber: number) => {
    setCurrentPage(clampPageNumber(pageNumber, pagination.totalPages));
  };

  const openCreateModal = () => {
    setEditingRepositoryId(null);
    setModalError("");
    setIsModalOpen(true);
  };

  const openEditModal = () => {
    setEditingRepositoryId(selectedRepositoryId);
    setModalError("");
    setIsModalOpen(true);
  };

  const openDeleteDialog = () => {
    if (!selectedRepositoryId) {
      return;
    }

    setDeleteError("");
    setDeletePreview(null);
    setIsDeleteDialogOpen(true);
    setIsLoadingDeletePreview(true);

    void loadRepositoryDeletePreview(selectedRepositoryId)
      .then((preview) => {
        setDeletePreview(preview);
      })
      .catch((error) => {
        setDeleteError(error instanceof Error ? error.message : "读取删除信息失败。");
      })
      .finally(() => {
        setIsLoadingDeletePreview(false);
      });
  };

  const closeModal = () => {
    if (isSavingRepository) {
      return;
    }

    setIsModalOpen(false);
    setModalError("");
  };

  const closeDeleteDialog = () => {
    if (isDeletingRepository || isLoadingDeletePreview) {
      return;
    }

    setIsDeleteDialogOpen(false);
    setDeleteError("");
    setDeletePreview(null);
  };

  const saveRepository = async (formValues: RepositoryFormValues) => {
    setModalError("");
    setIsSavingRepository(true);

    if (editingRepositoryId) {
      try {
        if (!window.skillsManager?.updateRepository) {
          throw new Error("保存来源接口不可用。");
        }

        const repositoryId = editingRepositoryId;

        await window.skillsManager.updateRepository(repositoryId, {
          branch: formValues.branch,
          name: formValues.name,
          note: formValues.note,
          patterns: formValues.patterns.trim(),
          provider: formValues.provider,
          remoteUrl: formValues.remoteUrl
        });
        const nextRepositories = await loadRepositories();

        setRepositories(nextRepositories);
        setSelectedRepositoryId(repositoryId);
        setIsModalOpen(false);
        setEditingRepositoryId(null);
      } catch (error) {
        setModalError(error instanceof Error ? error.message : "保存来源失败。");
      } finally {
        setIsSavingRepository(false);
      }
      return;
    } else {
      try {
        if (!window.skillsManager?.createRepository) {
          throw new Error("保存来源接口不可用。");
        }

        const createdRepository = await window.skillsManager?.createRepository?.({
          branch: formValues.branch,
          name: formValues.name,
          note: formValues.note,
          patterns: formValues.patterns.trim(),
          provider: formValues.provider,
          remoteUrl: formValues.remoteUrl
        });
        const nextRepositories = await loadRepositories();

        setRepositories(nextRepositories);
        setSelectedRepositoryId(createdRepository?.id ?? nextRepositories[0]?.id ?? null);
        setIsModalOpen(false);
        setEditingRepositoryId(null);
      } catch (error) {
        setModalError(error instanceof Error ? error.message : "保存来源失败。");
      } finally {
        setIsSavingRepository(false);
      }

      return;
    }
  };

  const copyCachePath = async () => {
    if (!selectedRepository) {
      return;
    }

    const absolutePath = await window.skillsManager?.resolveRepositoryCachePath?.(
      selectedRepository.cachePath
    );

    void navigator.clipboard?.writeText(absolutePath ?? selectedRepository.cachePath);
  };

  const openRepositoryLocation = (location: string) => {
    if (!window.skillsManager?.openRepositoryLocation) {
      return;
    }

    void window.skillsManager.openRepositoryLocation(location);
  };

  const confirmDeleteRepository = async () => {
    if (!deletePreview) {
      return;
    }

    setDeleteError("");
    setIsDeletingRepository(true);

    try {
      if (!window.skillsManager?.deleteRepository) {
        throw new Error("删除来源接口不可用。");
      }

      await window.skillsManager.deleteRepository(deletePreview.repositoryId);
      const nextRepositories = await loadRepositories();

      setRepositories(nextRepositories);
      setCheckedIds((currentIds) => {
        const nextIds = new Set(currentIds);
        nextIds.delete(deletePreview.repositoryId);
        return nextIds;
      });
      setSelectedRepositoryId(nextRepositories[0]?.id ?? null);
      setIsDeleteDialogOpen(false);
      setDeletePreview(null);
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : "删除来源失败。");
    } finally {
      setIsDeletingRepository(false);
    }
  };

  return {
    checkedIds,
    deleteError,
    deletePreview,
    editingRepository,
    hasCheckedRepositories,
    isDeleteDialogOpen,
    isDeletingRepository,
    isLoadingDeletePreview,
    isLocalSyncConfirmDialogOpen: pendingLocalSyncRepositoryIds.length > 0,
    isModalOpen,
    isSavingRepository,
    isSyncingRepositories: syncingRepositoryIds.size > 0,
    modalError,
    pagination,
    providerFilter,
    query,
    repositorySyncStates,
    selectedRepository,
    selectedRepositoryId,
    sort,
    statusFilter,
    syncProgressDialog,
    visibleAllChecked,
    visibleRepositories,
    visibleSomeChecked,
    closeDeleteDialog,
    closeLocalSyncConfirmDialog,
    closeModal,
    closeSyncProgressDialog,
    confirmDeleteRepository,
    confirmLocalSyncRepositories,
    copyCachePath,
    openDeleteDialog,
    openCreateModal,
    openEditModal,
    openRepositoryLocation,
    saveRepository,
    selectAllVisible,
    setRepositoriesPage,
    setProviderFilter,
    setQuery,
    setSelectedRepositoryId,
    setSort,
    setStatusFilter,
    syncCheckedRepositories,
    syncRepository,
    toggleRepositoryChecked,
    toggleRepositoryEnabled
  };
};

export type RepositoriesPageState = ReturnType<typeof useRepositoriesPageState>;

const loadRepositories = async (): Promise<RepositoryViewModel[]> => {
  const result = await window.skillsManager?.listRepositories?.();

  return adaptRepositoryRecords(result?.repositories ?? []);
};

const loadRepositoryDeletePreview = async (
  repositoryId: string
): Promise<RepositoryDeletePreview> => {
  if (!window.skillsManager?.getRepositoryDeletePreview) {
    throw new Error("删除预览接口不可用。");
  }

  return window.skillsManager.getRepositoryDeletePreview(repositoryId);
};

const persistRepositoryEnabled = async (
  repository: RepositoryViewModel,
  enabled: boolean
): Promise<void> => {
  if (!window.skillsManager?.updateRepository) {
    throw new Error("保存来源接口不可用。");
  }

  await window.skillsManager.updateRepository(repository.id, {
    branch: repository.branch,
    enabled,
    name: repository.name,
    note: repository.note,
    patterns: repository.patterns.join(", "),
    provider: repository.provider,
    remoteUrl: repository.remoteUrl
  });
};

const buildSyncingMessage = (repository: RepositoryViewModel): string => {
  return `正在同步。正在复制或拉取来源，并扫描 SKILL.md。缓存目录 ${repository.cachePath}`;
};

const buildSyncResultMessage = (result: Awaited<RepositoriesSyncResult>["results"][number]) => {
  const skillSummary =
    result.skillUnits > 0 ? `已入库 ${result.skillUnits} 个 Skills。` : "未发现可入库的 Skills。";

  return `同步完成。${skillSummary}新增 ${result.scan.added}，更新 ${result.scan.changed}，移除 ${result.scan.removed}，警告 ${result.scan.warnings}。`;
};

const createSyncProgressDialog = (
  repositories: Array<Pick<RepositoryViewModel, "id" | "name">>
): RepositorySyncProgressDialogState => {
  return {
    id: Date.now(),
    repositories: repositories.map(createSyncProgressRepository),
    status: "syncing"
  };
};

const createSyncProgressRepository = (
  repository: Pick<RepositoryViewModel, "id" | "name">
): RepositorySyncProgressRepository => {
  return {
    items: [],
    repositoryId: repository.id,
    repositoryName: repository.name
  };
};

const upsertSyncProgressEvent = (
  dialog: RepositorySyncProgressDialogState | null,
  event: RepositoriesSyncProgressEvent
): RepositorySyncProgressDialogState => {
  const nextDialog =
    dialog ??
    createSyncProgressDialog([
      {
        id: event.repositoryId,
        name: event.repositoryName
      }
    ]);
  const nextRepositories = upsertSyncProgressRepository(nextDialog.repositories, {
    item: {
      id: event.skill.skillUnitId,
      name: event.skill.name,
      status: event.status
    },
    repositoryId: event.repositoryId,
    repositoryName: event.repositoryName
  });

  return {
    ...nextDialog,
    repositories: nextRepositories,
    status: "syncing"
  };
};

const completeSyncProgressDialog = ({
  dialog,
  repositories,
  repositoryIds,
  resultByRepositoryId
}: {
  dialog: RepositorySyncProgressDialogState | null;
  repositories: RepositoryViewModel[];
  repositoryIds: string[];
  resultByRepositoryId: Map<string, Awaited<RepositoriesSyncResult>["results"][number]>;
}): RepositorySyncProgressDialogState | null => {
  if (!repositoryIds.length) {
    return dialog;
  }

  const targetRepositoryIdSet = new Set(repositoryIds);
  const repositoriesById = new Map(repositories.map((repository) => [repository.id, repository]));
  const baseDialog =
    dialog ??
    createSyncProgressDialog(
      repositoryIds
        .map((repositoryId) => repositoriesById.get(repositoryId))
        .filter((repository): repository is RepositoryViewModel => Boolean(repository))
    );
  const ensuredRepositories = ensureSyncProgressRepositories(
    baseDialog.repositories,
    repositoryIds
      .map((repositoryId) => repositoriesById.get(repositoryId))
      .filter((repository): repository is RepositoryViewModel => Boolean(repository))
  );
  const nextRepositories: RepositorySyncProgressRepository[] = ensuredRepositories.map(
    (repository) => {
      if (!targetRepositoryIdSet.has(repository.repositoryId)) {
        return repository;
      }

      const result = resultByRepositoryId.get(repository.repositoryId);
      const didFail = isFailedSyncResult(result);
      const fallbackItems = buildProgressItemsFromRepository(
        repositoriesById.get(repository.repositoryId)
      );
      const items = repository.items.length ? repository.items : fallbackItems;

      return {
        ...repository,
        items: items.map(
          (item): RepositorySyncProgressItem => ({
            ...item,
            status: didFail && item.status !== "completed" ? "failed" : "completed"
          })
        )
      };
    }
  );
  const hasFailure = repositoryIds.some((repositoryId) =>
    isFailedSyncResult(resultByRepositoryId.get(repositoryId))
  );

  return {
    ...baseDialog,
    repositories: nextRepositories,
    status: hasFailure ? "failed" : "completed"
  };
};

const failSyncProgressDialog = (
  dialog: RepositorySyncProgressDialogState | null,
  repositories: RepositoryViewModel[]
): RepositorySyncProgressDialogState => {
  const targetRepositoryIdSet = new Set(repositories.map((repository) => repository.id));
  const baseDialog = dialog ?? createSyncProgressDialog(repositories);
  const ensuredRepositories = ensureSyncProgressRepositories(baseDialog.repositories, repositories);

  return {
    ...baseDialog,
    repositories: ensuredRepositories.map((repository) => {
      if (!targetRepositoryIdSet.has(repository.repositoryId)) {
        return repository;
      }

      return {
        ...repository,
        items: repository.items.map(
          (item): RepositorySyncProgressItem => ({
            ...item,
            status: item.status === "completed" ? "completed" : "failed"
          })
        )
      };
    }),
    status: "failed"
  };
};

const ensureSyncProgressRepositories = (
  currentRepositories: RepositorySyncProgressRepository[],
  repositories: Array<Pick<RepositoryViewModel, "id" | "name">>
): RepositorySyncProgressRepository[] => {
  return repositories.reduce((nextRepositories, repository) => {
    if (nextRepositories.some((item) => item.repositoryId === repository.id)) {
      return nextRepositories;
    }

    return [...nextRepositories, createSyncProgressRepository(repository)];
  }, currentRepositories);
};

const upsertSyncProgressRepository = (
  repositories: RepositorySyncProgressRepository[],
  {
    item,
    repositoryId,
    repositoryName
  }: {
    item: RepositorySyncProgressItem;
    repositoryId: string;
    repositoryName: string;
  }
): RepositorySyncProgressRepository[] => {
  const repositoryIndex = repositories.findIndex(
    (repository) => repository.repositoryId === repositoryId
  );

  if (repositoryIndex === -1) {
    return [
      ...repositories,
      {
        items: [item],
        repositoryId,
        repositoryName
      }
    ];
  }

  return repositories.map((repository, index) =>
    index === repositoryIndex
      ? {
          ...repository,
          items: upsertSyncProgressItem(repository.items, item),
          repositoryName
        }
      : repository
  );
};

const upsertSyncProgressItem = (
  items: RepositorySyncProgressItem[],
  item: RepositorySyncProgressItem
): RepositorySyncProgressItem[] => {
  if (!items.some((currentItem) => currentItem.id === item.id)) {
    return [...items, item];
  }

  return items.map((currentItem) => (currentItem.id === item.id ? item : currentItem));
};

const buildProgressItemsFromRepository = (
  repository: RepositoryViewModel | undefined
): RepositorySyncProgressItem[] => {
  const scan = repository?.lastSyncSummary?.scan;

  if (!scan) {
    return [];
  }

  const itemsById = new Map<string, RepositorySyncProgressItem>();

  [...scan.added, ...scan.changed, ...scan.removed].forEach((skill) => {
    itemsById.set(skill.skillUnitId, {
      id: skill.skillUnitId,
      name: skill.name,
      status: "completed"
    });
  });

  return Array.from(itemsById.values());
};

const clearProgressItemCompletionTimeout = (
  itemId: string,
  timeoutIds: Map<string, number>
): void => {
  const timeoutId = timeoutIds.get(itemId);

  if (typeof timeoutId !== "number") {
    return;
  }

  window.clearTimeout(timeoutId);
  timeoutIds.delete(itemId);
};

const clearSyncProgressFinishTimeout = (timeoutRef: { current: number | null }): void => {
  if (typeof timeoutRef.current !== "number") {
    return;
  }

  window.clearTimeout(timeoutRef.current);
  timeoutRef.current = null;
};

const clearSyncProgressTimeouts = (
  itemCompletionTimeoutIds: Map<string, number>,
  finishTimeoutRef: { current: number | null }
): void => {
  itemCompletionTimeoutIds.forEach((timeoutId) => window.clearTimeout(timeoutId));
  itemCompletionTimeoutIds.clear();
  clearSyncProgressFinishTimeout(finishTimeoutRef);
};

const getRemainingSyncProgressDuration = (startedAt: number, now: number): number => {
  return Math.max(0, MIN_SYNC_PROGRESS_ITEM_DURATION_MS - (now - startedAt));
};

const getRemainingSyncProgressDurationForRepositories = ({
  itemRepositoryIds,
  itemStartedAt,
  now,
  repositoryIds
}: {
  itemRepositoryIds: Map<string, string>;
  itemStartedAt: Map<string, number>;
  now: number;
  repositoryIds: string[];
}): number => {
  const repositoryIdSet = new Set(repositoryIds);
  let remainingDuration = 0;

  itemStartedAt.forEach((startedAt, itemId) => {
    const repositoryId = itemRepositoryIds.get(itemId);

    if (!repositoryId || !repositoryIdSet.has(repositoryId)) {
      return;
    }

    remainingDuration = Math.max(
      remainingDuration,
      getRemainingSyncProgressDuration(startedAt, now)
    );
  });

  return remainingDuration;
};

const isFailedSyncResult = (
  result: Awaited<RepositoriesSyncResult>["results"][number] | undefined
): boolean => {
  return Boolean(result?.error || result?.status === "failed");
};
