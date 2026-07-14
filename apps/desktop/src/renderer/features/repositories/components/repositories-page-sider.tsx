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
        delete: t("repositories.actions.deleteRepository"),
        edit: t("repositories.actions.editRepository"),
        enabled: t("repositories.detail.enabled"),
        enabledNo: t("repositories.detail.enabledNo"),
        enabledYes: t("repositories.detail.enabledYes"),
        lastCommit: t("repositories.detail.lastCommit"),
        lastScan: t("repositories.detail.lastScan"),
        openLocation: (location) => t("repositories.detail.openLocation", { location }),
        patterns: t("repositories.detail.patterns"),
        provider: t("repositories.detail.provider"),
        remoteUrl: t("repositories.detail.remoteUrl"),
        scanAdded: t("repositories.detail.scanAdded"),
        scanChanged: t("repositories.detail.scanChanged"),
        scanDetailsAction: t("repositories.detail.scanDetailsAction"),
        scanHeading: t("repositories.detail.scanHeading"),
        scanRemoved: t("repositories.detail.scanRemoved"),
        scanWarnings: t("repositories.detail.scanWarnings"),
        syncDetailsHeading: t("repositories.detail.syncDetailsHeading"),
        distributionHeading: t("repositories.detail.distributionHeading"),
        autoDistribution: t("repositories.detail.autoDistribution"),
        autoDistributionEnabled: t("repositories.detail.autoDistributionEnabled"),
        autoDistributionDisabled: t("repositories.detail.autoDistributionDisabled"),
        distributionEligible: t("repositories.detail.distributionEligible"),
        distributionInstalled: t("repositories.detail.distributionInstalled"),
        distributionUpdated: t("repositories.detail.distributionUpdated"),
        distributionSkipped: t("repositories.detail.distributionSkipped"),
        distributionConflicts: t("repositories.detail.distributionConflicts"),
        distributionBlocked: t("repositories.detail.distributionBlocked"),
        distributionFailed: t("repositories.detail.distributionFailed")
      }}
      repository={page.selectedRepository}
      onCopyCachePath={page.copyCachePath}
      onDelete={page.openDeleteDialog}
      onEdit={page.openEditModal}
      onOpenLocation={page.openRepositoryLocation}
    />
  );
};
