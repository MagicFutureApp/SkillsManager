import { ProviderDetail } from "./provider-detail";
import { useProvidersPageContext } from "./providers-page-context";
import React from "react";
import { useTranslation } from "react-i18next";

export const ProvidersPageSider = () => {
  const { t } = useTranslation();
  const page = useProvidersPageContext();

  return (
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
      provider={page.selectedProvider}
      testLabel={t("providers.actions.testAccess")}
      onConnect={page.connectSelectedProvider}
      onDisconnect={page.disconnectSelectedProvider}
      onTest={page.testSelectedProvider}
    />
  );
};
