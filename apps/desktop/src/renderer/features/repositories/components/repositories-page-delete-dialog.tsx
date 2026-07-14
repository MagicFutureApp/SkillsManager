import { RepositoryDeleteDialog } from "./repository-delete-dialog";
import { useRepositoriesPageContext } from "./repositories-page-context";
import React from "react";
import { useTranslation } from "react-i18next";

export const RepositoriesPageDeleteDialog = () => {
  const { t } = useTranslation();
  const page = useRepositoriesPageContext();

  return (
    <RepositoryDeleteDialog
      copy={{
        cachePath: t("repositories.deleteDialog.cachePath"),
        cancel: t("repositories.deleteDialog.cancel"),
        confirm: t("repositories.deleteDialog.confirm"),
        description: t("repositories.deleteDialog.description"),
        emptySkills: t("repositories.deleteDialog.emptySkills"),
        loading: t("repositories.deleteDialog.loading"),
        skillsHeading: t("repositories.deleteDialog.skillsHeading"),
        title: t("repositories.deleteDialog.title")
      }}
      error={page.deleteError}
      isDeleting={page.isDeletingRepository}
      isLoading={page.isLoadingDeletePreview}
      open={page.isDeleteDialogOpen}
      preview={page.deletePreview}
      onClose={page.closeDeleteDialog}
      onConfirm={page.confirmDeleteRepository}
    />
  );
};
