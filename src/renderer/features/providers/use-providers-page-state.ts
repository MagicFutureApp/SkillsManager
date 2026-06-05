import {
  adaptProviderRecords,
  createDefaultProviders,
  filterProviders,
  type ProviderFilter,
  type ProviderSort,
  type ProviderStatusFilter,
  type ProviderViewModel
} from "./provider-data";
import { useEffect, useMemo, useState } from "react";

export const useProvidersPageState = () => {
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
        diagnostic: `provider: ${provider.name}\nauth: ${provider.authMode}\nconnection: ${
          provider.connected ? "active" : "not connected"
        }\nresult: ${provider.connected ? "access ready" : "login required"}`,
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
      diagnostic: `provider: ${item.name}\nconnection: ${
        item.connected ? "disconnected" : "active"
      }\nresult: ${item.connected ? "access disabled" : "connected"}`,
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

  return {
    providerFilter,
    selectedProvider,
    selectedProviderId,
    sort,
    statusFilter,
    visibleProviders,
    connectSelectedProvider,
    disconnectSelectedProvider,
    runDiagnostics,
    setProviderFilter,
    setSelectedProviderId,
    setSort,
    setStatusFilter,
    testSelectedProvider,
    toggleConnection
  };
};

export type ProvidersPageState = ReturnType<typeof useProvidersPageState>;
