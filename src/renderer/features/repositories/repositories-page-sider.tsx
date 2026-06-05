import { RepositoryDetail } from "./repository-detail";
import { useRepositoriesPageContext } from "./repositories-page-context";
import React from "react";
import { useTranslation } from "react-i18next";

export const RepositoriesPageSider = () => {
  const { t } = useTranslation();
  const page = useRepositoriesPageContext();

  return (
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
      repository={page.selectedRepository}
      onCopyCachePath={page.copyCachePath}
      onEdit={page.openEditModal}
    />
  );
};
