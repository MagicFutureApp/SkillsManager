import { Button } from "@/components/ui/button";
import { ProviderDetail } from "./provider-detail";
import { ProviderFilters } from "./provider-filters";
import { ProviderList } from "./provider-list";
import {
  createDefaultProviders,
  adaptProviderRecords,
  filterProviders,
  type ProviderFilter,
  type ProviderSort,
  type ProviderStatusFilter,
  type ProviderViewModel
} from "./provider-data";
import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

export const ProvidersPage = () => {
  const { t } = useTranslation();
  const [providers, setProviders] = useState<ProviderViewModel[]>(() => createDefaultProviders());
  const [providerFilter, setProviderFilter] = useState<ProviderFilter>("all");
  const [statusFilter, setStatusFilter] = useState<ProviderStatusFilter>("all");
  const [sort, setSort] = useState<ProviderSort>("priority");
  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(
    () => providers[0]?.id ?? null
  );

  useEffect(() => {
    let isMounted = true;

    void window.skillsManager?.listProviders().then((result) => {
      if (!isMounted) {
        return;
      }

      setProviders(adaptProviderRecords(result.providers));
    });

    return () => {
      isMounted = false;
    };
  }, []);

  const visibleProviders = useMemo(() => {
    return filterProviders({
      provider: providerFilter,
      providers,
      sort,
      status: statusFilter
    });
  }, [providerFilter, providers, sort, statusFilter]);

  const selectedProvider = providers.find((provider) => provider.id === selectedProviderId) ?? null;

  const updateProvider = (
    providerId: string | null,
    updater: (provider: ProviderViewModel) => ProviderViewModel
  ) => {
    if (!providerId) {
      return;
    }

    setProviders((currentProviders) =>
      currentProviders.map((provider) =>
        provider.id === providerId ? updater(provider) : provider
      )
    );
  };

  const connectSelectedProvider = () => {
    updateProvider(selectedProviderId, (provider) => ({
      ...provider,
      connected: true,
      diagnostic: `provider: ${provider.name}\nauth: ${provider.authMode}\nconnection: active\nresult: connected`,
      enabled: true,
      status: "connected"
    }));
  };

  const disconnectSelectedProvider = () => {
    updateProvider(selectedProviderId, (provider) => ({
      ...provider,
      connected: false,
      diagnostic: `provider: ${provider.name}\nconnection: disconnected\nresult: access disabled`,
      enabled: false,
      status: "error"
    }));
  };

  const testSelectedProvider = () => {
    updateProvider(selectedProviderId, (provider) => {
      const status = provider.connected ? "connected" : "error";

      return {
        ...provider,
        diagnostic: `provider: ${provider.name}\nauth: ${provider.authMode}\nconnection: ${provider.connected ? "active" : "not connected"}\nresult: ${provider.connected ? "access ready" : "login required"}`,
        status
      };
    });
  };

  const toggleConnection = (providerId: string) => {
    const provider = providers.find((item) => item.id === providerId);

    if (!provider) {
      return;
    }

    setSelectedProviderId(providerId);
    updateProvider(providerId, (item) => ({
      ...item,
      connected: !item.connected,
      diagnostic: `provider: ${item.name}\nconnection: ${item.connected ? "disconnected" : "active"}\nresult: ${item.connected ? "access disabled" : "connected"}`,
      enabled: !item.connected,
      status: item.connected ? "error" : "connected"
    }));
  };

  const runDiagnostics = () => {
    setProviders((currentProviders) =>
      currentProviders.map((provider) =>
        provider.connected
          ? {
              ...provider,
              diagnostic: `${provider.diagnostic}\nqueued access test: manual run requested`
            }
          : provider
      )
    );
  };

  return (
    <div className="grid min-h-svh grid-cols-[minmax(620px,1fr)_360px] bg-background">
      <main className="min-w-0 p-7">
        <header className="mb-6">
          <p className="mb-1 text-sm">{t("providers.pageLabel")}</p>
          <div className="flex items-center justify-between gap-4 max-[860px]:items-start">
            <div className="min-w-0">
              <h1 className="text-[28px] font-semibold leading-tight">{t("providers.heading")}</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
                {t("providers.description")}
              </p>
            </div>
            <Button type="button" variant="outline" className="mt-1" onClick={runDiagnostics}>
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
          provider={providerFilter}
          sort={sort}
          status={statusFilter}
          onProviderChange={setProviderFilter}
          onSortChange={setSort}
          onStatusChange={setStatusFilter}
        />

        <div className="mt-5">
          <ProviderList
            actionLabel={(provider) =>
              provider.connected
                ? t("providers.actions.disconnect")
                : t("providers.actions.connect")
            }
            authHeader={t("providers.table.auth")}
            connectionHeader={t("providers.table.connection")}
            emptyMessage={t("providers.empty")}
            providerHeader={t("providers.table.provider")}
            providers={visibleProviders}
            selectedProviderId={selectedProviderId}
            statusHeader={t("providers.table.status")}
            onSelectProvider={setSelectedProviderId}
            onToggleConnection={toggleConnection}
          />
        </div>
      </main>

      <ProviderDetail
        connectLabel={t("providers.actions.connect")}
        connectionConfigHeading={t("providers.detail.connectionConfig")}
        copy={{
          authMode: t("providers.detail.authMode"),
          connected: t("providers.detail.connected"),
          connection: t("providers.detail.connection"),
          defaultEmptyDescription: t("providers.detail.emptyDescription"),
          defaultEmptyTitle: t("providers.detail.emptyTitle"),
          discoveryStrategy: t("providers.detail.discoveryStrategy"),
          enabled: t("providers.detail.enabled"),
          notConnected: t("providers.detail.notConnected"),
          provider: t("providers.detail.provider"),
          status: t("providers.detail.status")
        }}
        defaultRulesHeading={t("providers.detail.defaultRules")}
        diagnosticHeading={t("providers.detail.recentDiagnostics")}
        disconnectLabel={t("providers.actions.disconnect")}
        provider={selectedProvider}
        testLabel={t("providers.actions.testAccess")}
        onConnect={connectSelectedProvider}
        onDisconnect={disconnectSelectedProvider}
        onTest={testSelectedProvider}
      />
    </div>
  );
};
