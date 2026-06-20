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
import type { RepositoriesSyncResult, RepositoryDeletePreview } from "@/global";
import { useEffect, useMemo, useState } from "react";

export type RepositorySyncState =
  | {
      message: string;
      status: "syncing";
    }
  | {
      message: string;
      status: "success" | "empty" | "failed";
    };

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
  const [modalError, setModalError] = useState("");
  const [providerFilter, setProviderFilter] = useState<RepositoryProviderFilter>("all");
  const [query, setQuery] = useState("");
  const [repositorySyncStates, setRepositorySyncStates] = useState<
    Record<string, RepositorySyncState>
  >({});
  const [selectedRepositoryId, setSelectedRepositoryId] = useState<string | null>(
    () => repositories[0]?.id ?? null
  );
  const [sort, setSort] = useState<RepositorySort>("priority");
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

  const visibleRepositories = useMemo(() => {
    return filterRepositories({
      provider: providerFilter,
      query,
      repositories,
      sort,
      status: statusFilter
    });
  }, [providerFilter, query, repositories, sort, statusFilter]);

  const selectedRepository =
    repositories.find((repository) => repository.id === selectedRepositoryId) ?? null;
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
    } finally {
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

  const syncCheckedRepositories = async () => {
    await syncRepositoriesByIds(Array.from(checkedIds));
  };

  const syncRepository = async (repositoryId: string) => {
    await syncRepositoriesByIds([repositoryId]);
  };

  const toggleRepositoryEnabled = (repositoryId: string) => {
    setSelectedRepositoryId(repositoryId);
    updateRepository(repositoryId, (repository) => ({
      ...repository,
      enabled: !repository.enabled
    }));
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

  const copyCachePath = () => {
    if (!selectedRepository) {
      return;
    }

    void navigator.clipboard?.writeText(selectedRepository.cachePath);
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
    providerFilter,
    query,
    repositorySyncStates,
    selectedRepository,
    selectedRepositoryId,
    sort,
    statusFilter,
    visibleAllChecked,
    visibleRepositories,
    visibleSomeChecked,
    closeDeleteDialog,
    closeLocalSyncConfirmDialog,
    closeModal,
    confirmDeleteRepository,
    confirmLocalSyncRepositories,
    copyCachePath,
    openDeleteDialog,
    openCreateModal,
    openEditModal,
    openRepositoryLocation,
    saveRepository,
    selectAllVisible,
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

const buildSyncingMessage = (repository: RepositoryViewModel): string => {
  return `正在同步。正在复制或拉取来源，并扫描 SKILL.md。缓存目录 ${repository.cachePath}`;
};

const buildSyncResultMessage = (result: Awaited<RepositoriesSyncResult>["results"][number]) => {
  const skillSummary =
    result.skillUnits > 0 ? `已入库 ${result.skillUnits} 个 Skills。` : "未发现可入库的 Skills。";

  return `同步完成。${skillSummary}新增 ${result.scan.added}，更新 ${result.scan.changed}，移除 ${result.scan.removed}，警告 ${result.scan.warnings}。commit ${result.commitSha ?? "--"}`;
};
