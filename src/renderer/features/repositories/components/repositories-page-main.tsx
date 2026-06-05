import { Button } from "@/components/ui/button";
import { RepositoryFilters } from "./repository-filters";
import { RepositoryList } from "./repository-list";
import { useRepositoriesPageContext } from "./repositories-page-context";
import React from "react";
import { useTranslation } from "react-i18next";

export const RepositoriesPageMain = () => {
  const { t } = useTranslation();
  const page = useRepositoriesPageContext();

  return (
    <>
      <header className="mb-6">
        <p className="mb-1 text-sm">{t("repositories.pageLabel")}</p>
        <div className="flex items-center justify-between gap-4 max-[860px]:items-start">
          <div className="min-w-0">
            <h1 className="text-[28px] font-semibold leading-tight">{t("repositories.heading")}</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              {t("repositories.description")}
            </p>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={!page.selectedRepository}
              onClick={() => page.syncSelectedRepository(false)}
            >
              {t("repositories.actions.syncSelected")}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={!page.selectedRepository}
              onClick={() => page.syncSelectedRepository(true)}
            >
              {t("repositories.actions.forceRescan")}
            </Button>
            <Button type="button" onClick={page.openCreateModal}>
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
        provider={page.providerFilter}
        query={page.query}
        sort={page.sort}
        status={page.statusFilter}
        onProviderChange={page.setProviderFilter}
        onQueryChange={page.setQuery}
        onSortChange={page.setSort}
        onStatusChange={page.setStatusFilter}
      />

      <div className="mt-5">
        <RepositoryList
          checkedIds={page.checkedIds}
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
          repositories={page.visibleRepositories}
          selectedRepositoryId={page.selectedRepositoryId}
          visibleAllChecked={page.visibleAllChecked}
          visibleSomeChecked={page.visibleSomeChecked}
          onSelectAllVisible={page.selectAllVisible}
          onSelectRepository={page.setSelectedRepositoryId}
          onToggleChecked={page.toggleRepositoryChecked}
          onToggleEnabled={page.toggleRepositoryEnabled}
        />
      </div>
    </>
  );
};
