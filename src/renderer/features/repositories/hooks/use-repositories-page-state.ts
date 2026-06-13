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
import { useEffect, useMemo, useState } from "react";

type RepositoryScanLabels = {
  justForceScanned: string;
  justSynced: string;
};

export const useRepositoriesPageState = (scanLabels: RepositoryScanLabels) => {
  const [repositories, setRepositories] = useState<RepositoryViewModel[]>(() =>
    createDefaultRepositories()
  );
  const [checkedIds, setCheckedIds] = useState<Set<string>>(() => new Set());
  const [editingRepositoryId, setEditingRepositoryId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSavingRepository, setIsSavingRepository] = useState(false);
  const [modalError, setModalError] = useState("");
  const [providerFilter, setProviderFilter] = useState<RepositoryProviderFilter>("all");
  const [query, setQuery] = useState("");
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

  const syncCheckedRepositories = () => {
    if (!checkedIds.size) {
      return;
    }

    const nextSelectedRepositoryId = checkedIds.has(selectedRepositoryId ?? "")
      ? selectedRepositoryId
      : (checkedIds.values().next().value ?? null);

    setSelectedRepositoryId(nextSelectedRepositoryId);
    setRepositories((currentRepositories) =>
      currentRepositories.map((repository) =>
        checkedIds.has(repository.id)
          ? {
              ...repository,
              lastCommit:
                repository.provider === "Local Git" ? "local" : nextCommit(repository.lastCommit),
              lastScanLabel: scanLabels.justSynced,
              status: repository.scan.warnings > 0 ? "review" : "ready"
            }
          : repository
      )
    );
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

  const closeModal = () => {
    if (isSavingRepository) {
      return;
    }

    setIsModalOpen(false);
    setModalError("");
  };

  const saveRepository = async (formValues: RepositoryFormValues) => {
    setModalError("");
    setIsSavingRepository(true);

    if (editingRepositoryId) {
      setRepositories((currentRepositories) =>
        currentRepositories.map((repository) =>
          repository.id === editingRepositoryId
            ? {
                ...repository,
                branch: formValues.branch,
                cachePath: formValues.cachePath || repository.cachePath,
                name: formValues.name,
                note: formValues.note || repository.note,
                patterns: formValues.patterns
                  .split(",")
                  .map((pattern) => pattern.trim())
                  .filter(Boolean),
                provider: formValues.provider,
                remoteUrl: formValues.remoteUrl
              }
            : repository
        )
      );
      setSelectedRepositoryId(editingRepositoryId);
      setIsModalOpen(false);
      setEditingRepositoryId(null);
      setIsSavingRepository(false);
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
          patterns: formValues.patterns
            .split(",")
            .map((pattern) => pattern.trim())
            .filter(Boolean),
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

  return {
    checkedIds,
    editingRepository,
    hasCheckedRepositories,
    isModalOpen,
    isSavingRepository,
    modalError,
    providerFilter,
    query,
    selectedRepository,
    selectedRepositoryId,
    sort,
    statusFilter,
    visibleAllChecked,
    visibleRepositories,
    visibleSomeChecked,
    closeModal,
    copyCachePath,
    openCreateModal,
    openEditModal,
    saveRepository,
    selectAllVisible,
    setProviderFilter,
    setQuery,
    setSelectedRepositoryId,
    setSort,
    setStatusFilter,
    syncCheckedRepositories,
    toggleRepositoryChecked,
    toggleRepositoryEnabled
  };
};

export type RepositoriesPageState = ReturnType<typeof useRepositoriesPageState>;

const loadRepositories = async (): Promise<RepositoryViewModel[]> => {
  const result = await window.skillsManager?.listRepositories?.();

  return adaptRepositoryRecords(result?.repositories ?? []);
};

const nextCommit = (currentCommit: string): string => {
  if (!currentCommit || currentCommit === "--" || currentCommit === "remote") {
    return "pending";
  }

  if (currentCommit === "local") {
    return currentCommit;
  }

  return currentCommit.slice(0, 6);
};
