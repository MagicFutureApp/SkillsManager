import { Button } from "@/components/ui/button";
import { ProviderFilters } from "./provider-filters";
import { ProviderList } from "./provider-list";
import { useProvidersPageContext } from "./providers-page-context";
import React from "react";
import { useTranslation } from "react-i18next";

export const ProvidersPageMain = () => {
  const { t } = useTranslation();
  const page = useProvidersPageContext();

  return (
    <>
      <header className="mb-6">
        <p className="mb-1 text-sm">{t("providers.pageLabel")}</p>
        <div className="flex items-center justify-between gap-4 max-[860px]:items-start">
          <div className="min-w-0">
            <h1 className="text-[28px] font-semibold leading-tight">{t("providers.heading")}</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              {t("providers.description")}
            </p>
          </div>
          <Button type="button" variant="outline" className="mt-1" onClick={page.runDiagnostics}>
            {t("providers.actions.runDiagnostics")}
          </Button>
        </div>
      </header>

      <ProviderFilters
        copy={{
          ariaLabel: t("providers.filters.ariaLabel"),
          provider: t("providers.filters.provider"),
          sort: t("providers.filters.sort"),
          sortName: t("providers.filters.sortName"),
          sortPriority: t("providers.filters.sortPriority"),
          sortProvider: t("providers.filters.sortProvider"),
          sortStatus: t("providers.filters.sortStatus"),
          status: t("providers.filters.status")
        }}
        provider={page.providerFilter}
        sort={page.sort}
        status={page.statusFilter}
        onProviderChange={page.setProviderFilter}
        onSortChange={page.setSort}
        onStatusChange={page.setStatusFilter}
      />

      <div className="mt-5">
        <ProviderList
          actionLabel={(provider) =>
            provider.connected ? t("providers.actions.disconnect") : t("providers.actions.connect")
          }
          authHeader={t("providers.table.auth")}
          connectionHeader={t("providers.table.connection")}
          emptyMessage={t("providers.empty")}
          providerHeader={t("providers.table.provider")}
          providers={page.visibleProviders}
          selectedProviderId={page.selectedProviderId}
          statusHeader={t("providers.table.status")}
          onSelectProvider={page.setSelectedProviderId}
          onToggleConnection={page.toggleConnection}
        />
      </div>
    </>
  );
};
