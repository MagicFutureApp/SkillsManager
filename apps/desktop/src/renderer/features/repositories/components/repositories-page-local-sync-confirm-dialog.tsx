import { RepositoryLocalSyncConfirmDialog } from "./repository-local-sync-confirm-dialog";
import { useRepositoriesPageContext } from "./repositories-page-context";
import React from "react";
import { useTranslation } from "react-i18next";

export const RepositoriesPageLocalSyncConfirmDialog = () => {
  const { t } = useTranslation();
  const page = useRepositoriesPageContext();

  return (
    <RepositoryLocalSyncConfirmDialog
      copy={{
        cancel: t("repositories.localSyncDialog.cancel"),
        confirm: t("repositories.localSyncDialog.confirm"),
        description: t("repositories.localSyncDialog.description"),
        title: t("repositories.localSyncDialog.title")
      }}
      open={page.isLocalSyncConfirmDialogOpen}
      onClose={page.closeLocalSyncConfirmDialog}
      onConfirm={() => void page.confirmLocalSyncRepositories()}
    />
  );
};
