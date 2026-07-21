import { RepositoryModal } from "./repository-modal";
import { useRepositoriesPageContext } from "./repositories-page-context";
import React from "react";
import { useTranslation } from "react-i18next";

export const RepositoriesPageModal = () => {
  const { t } = useTranslation();
  const page = useRepositoriesPageContext();

  return (
    <RepositoryModal
      copy={{
        branch: t("repositories.modal.branch"),
        browseLocalPath: t("repositories.modal.browseLocalPath"),
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
      editingRepository={page.editingRepository}
      error={page.modalError}
      isSaving={page.isSavingRepository}
      open={page.isModalOpen}
      onClose={page.closeModal}
      onSave={page.saveRepository}
    />
  );
};
