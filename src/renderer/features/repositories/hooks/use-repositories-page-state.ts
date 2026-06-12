import {
  adaptRepositoryRecords,
  buildRepositoryFromForm,
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
  const [providerFilter, setProviderFilter] = useState<RepositoryProviderFilter>("all");
  const [query, setQuery] = useState("");
  const [selectedRepositoryId, setSelectedRepositoryId] = useState<string | null>(
    () => repositories[0]?.id ?? null
  );
  const [sort, setSort] = useState<RepositorySort>("priority");
  const [statusFilter, setStatusFilter] = useState<RepositoryStatusFilter>("all");

  useEffect(() => {
    let isMounted = true;

    void window.skillsManager?.listRepositories?.().then((result) => {
      if (isMounted) {
        const nextRepositories = adaptRepositoryRecords(result.repositories);
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
    setIsModalOpen(true);
  };

  const openEditModal = () => {
    setEditingRepositoryId(selectedRepositoryId);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const saveRepository = (formValues: RepositoryFormValues) => {
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
    } else {
      const nextRepository = buildRepositoryFromForm({
        formValues,
        index: repositories.length
      });

      setRepositories((currentRepositories) => [nextRepository, ...currentRepositories]);
      setSelectedRepositoryId(nextRepository.id);
    }

    setIsModalOpen(false);
    setEditingRepositoryId(null);
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

const nextCommit = (currentCommit: string): string => {
  if (!currentCommit || currentCommit === "--" || currentCommit === "remote") {
    return "pending";
  }

  if (currentCommit === "local") {
    return currentCommit;
  }

  return currentCommit.slice(0, 6);
};
