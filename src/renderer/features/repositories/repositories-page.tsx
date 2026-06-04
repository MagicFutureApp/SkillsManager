import { Button } from "@/components/ui/button";
import { RepositoryDetail } from "./repository-detail";
import { RepositoryFilters } from "./repository-filters";
import { RepositoryList } from "./repository-list";
import { RepositoryModal } from "./repository-modal";
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
} from "./repository-data";
import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

export const RepositoriesPage = () => {
  const { t } = useTranslation();
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
        setRepositories(adaptRepositoryRecords(result.repositories));
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

  const syncSelectedRepository = (force: boolean) => {
    updateRepository(selectedRepositoryId, (repository) => ({
      ...repository,
      lastCommit: repository.provider === "Local Git" ? "local" : nextCommit(repository.lastCommit),
      lastScanLabel: force
        ? t("repositories.scan.justForceScanned")
        : t("repositories.scan.justSynced"),
      scan: {
        ...repository.scan,
        added: force ? Math.max(1, repository.scan.added) : repository.scan.added,
        changed: force ? repository.scan.changed + 1 : repository.scan.changed
      },
      status: repository.scan.warnings > 0 ? "review" : "ready"
    }));
  };

  const toggleRepositoryEnabled = (repositoryId: string) => {
    setSelectedRepositoryId(repositoryId);
    updateRepository(repositoryId, (repository) => ({
      ...repository,
      enabled: !repository.enabled
    }));
  };

  const toggleRepositoryChecked = (repositoryId: string, checked: boolean) => {
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

  return (
    <div className="grid min-h-svh grid-cols-[minmax(620px,1fr)_360px] bg-background">
      <main className="min-w-0 p-7">
        <header className="mb-6">
          <p className="mb-1 text-sm">{t("repositories.pageLabel")}</p>
          <div className="flex items-center justify-between gap-4 max-[860px]:items-start">
            <div className="min-w-0">
              <h1 className="text-[28px] font-semibold leading-tight">
                {t("repositories.heading")}
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
                {t("repositories.description")}
              </p>
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={!selectedRepository}
                onClick={() => syncSelectedRepository(false)}
              >
                {t("repositories.actions.syncSelected")}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={!selectedRepository}
                onClick={() => syncSelectedRepository(true)}
              >
                {t("repositories.actions.forceRescan")}
              </Button>
              <Button type="button" onClick={openCreateModal}>
                {t("repositories.actions.addRepository")}
              </Button>
            </div>
          </div>
        </header>

        <RepositoryFilters
          copy={{
            allProviders: t("repositories.filters.allProviders"),
            allStatuses: t("repositories.filters.allStatuses"),
            ariaLabel: t("repositories.filters.ariaLabel"),
            provider: t("repositories.filters.provider"),
            search: t("repositories.filters.search"),
            searchPlaceholder: t("repositories.filters.searchPlaceholder"),
            sort: t("repositories.filters.sort"),
            sortName: t("repositories.filters.sortName"),
            sortPriority: t("repositories.filters.sortPriority"),
            sortProvider: t("repositories.filters.sortProvider"),
            sortSkills: t("repositories.filters.sortSkills"),
            sortStatus: t("repositories.filters.sortStatus"),
            status: t("repositories.filters.status")
          }}
          provider={providerFilter}
          query={query}
          sort={sort}
          status={statusFilter}
          onProviderChange={setProviderFilter}
          onQueryChange={setQuery}
          onSortChange={setSort}
          onStatusChange={setStatusFilter}
        />

        <div className="mt-5">
          <RepositoryList
            checkedIds={checkedIds}
            copy={{
              actions: t("repositories.table.actions"),
              branch: t("repositories.table.branch"),
              empty: t("repositories.empty"),
              provider: t("repositories.table.provider"),
              repository: t("repositories.table.repository"),
              selectAll: t("repositories.table.selectAll"),
              selectRepository: (name) => t("repositories.table.selectRepository", { name }),
              skills: t("repositories.table.skills"),
              status: t("repositories.table.status"),
              toggleEnabled: (name) => t("repositories.table.toggleEnabled", { name })
            }}
            repositories={visibleRepositories}
            selectedRepositoryId={selectedRepositoryId}
            visibleAllChecked={visibleAllChecked}
            visibleSomeChecked={visibleSomeChecked}
            onSelectAllVisible={selectAllVisible}
            onSelectRepository={setSelectedRepositoryId}
            onToggleChecked={toggleRepositoryChecked}
            onToggleEnabled={toggleRepositoryEnabled}
          />
        </div>
      </main>

      <RepositoryDetail
        copy={{
          branch: t("repositories.detail.branch"),
          cachePath: t("repositories.detail.cachePath"),
          copyCache: t("repositories.actions.copyCachePath"),
          defaultDescription: t("repositories.detail.emptyDescription"),
          defaultTitle: t("repositories.detail.emptyTitle"),
          edit: t("repositories.actions.editRepository"),
          enabled: t("repositories.detail.enabled"),
          lastCommit: t("repositories.detail.lastCommit"),
          lastScan: t("repositories.detail.lastScan"),
          patterns: t("repositories.detail.patterns"),
          provider: t("repositories.detail.provider"),
          remoteUrl: t("repositories.detail.remoteUrl"),
          scanAdded: t("repositories.detail.scanAdded"),
          scanChanged: t("repositories.detail.scanChanged"),
          scanHeading: t("repositories.detail.scanHeading"),
          scanRemoved: t("repositories.detail.scanRemoved"),
          scanWarnings: t("repositories.detail.scanWarnings")
        }}
        repository={selectedRepository}
        onCopyCachePath={copyCachePath}
        onEdit={openEditModal}
      />

      <RepositoryModal
        copy={{
          branch: t("repositories.modal.branch"),
          cancel: t("repositories.modal.cancel"),
          close: t("repositories.modal.close"),
          editDescription: t("repositories.modal.editDescription"),
          editTitle: t("repositories.modal.editTitle"),
          name: t("repositories.modal.name"),
          newDescription: t("repositories.modal.newDescription"),
          newTitle: t("repositories.modal.newTitle"),
          note: t("repositories.modal.note"),
          patterns: t("repositories.modal.patterns"),
          patternsPlaceholder: t("repositories.modal.patternsPlaceholder"),
          provider: t("repositories.modal.provider"),
          remoteUrl: t("repositories.modal.remoteUrl"),
          requiredError: t("repositories.modal.requiredError"),
          save: t("repositories.modal.save"),
          sourceInspectionError: t("repositories.modal.sourceInspectionError"),
          sourceInspectionLoading: t("repositories.modal.sourceInspectionLoading")
        }}
        editingRepository={editingRepository}
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={saveRepository}
      />
    </div>
  );
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
