import React from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

import { TargetDirectorySelector } from "./target-directory-selector";
import { useTargetsPageContext } from "./targets-page-context";

export const TargetsEditDialog = () => {
  const { t } = useTranslation();
  const page = useTargetsPageContext();

  const submitForm = () => {
    void page.saveEditTarget();
  };
  const errorMessage = getEditTargetErrorMessage(page.editTargetError, {
    customAgentDirectoryRequired: t("targets.modal.customAgentFolderRequiredError"),
    failed: t("targets.editDialog.saveError"),
    required: t("targets.editDialog.requiredError"),
    unavailable: t("targets.editDialog.unavailableError")
  });

  return (
    <Modal
      open={page.isEditTargetDialogOpen}
      onClose={page.closeEditTargetDialog}
      title={t("targets.editDialog.title")}
      description={t("targets.editDialog.description")}
      error={errorMessage}
      onSubmit={submitForm}
      footer={
        <>
          <Button
            type="button"
            variant="outline"
            disabled={page.isSavingEditTarget}
            onClick={page.closeEditTargetDialog}
          >
            {t("targets.editDialog.cancel")}
          </Button>
          <Button type="submit" disabled={page.isSavingEditTarget}>
            {t("targets.editDialog.save")}
          </Button>
        </>
      }
    >
      <div className="grid gap-3">
        <TargetDirectorySelector
          customAgentDirectoryName={page.customTargetAgentDirectoryName}
          disabled={page.isSavingEditTarget}
          isCustomAgentDirectorySelected={page.isCustomTargetAgentDirectorySelected}
          onCustomAgentDirectoryNameChange={page.setEditCustomTargetAgentDirectoryName}
          onSelectAgentDirectoryOption={page.selectEditTargetAgentDirectoryOption}
          onSelectCustomAgentDirectoryOption={page.selectEditCustomTargetAgentDirectoryOption}
          path={page.editTargetPath}
          pathLabel={t("targets.editDialog.path")}
          pendingDirectory={page.pendingTargetAgentDirectory}
          selectedAgentType={page.selectedTargetAgentType}
          showBrowse={false}
        />

        <Field>
          <FieldLabel>{t("targets.editDialog.name")}</FieldLabel>
          <Input
            disabled={page.isSavingEditTarget}
            value={page.editTargetName}
            onValueChange={page.setEditTargetName}
          />
        </Field>
      </div>
    </Modal>
  );
};

const getEditTargetErrorMessage = (
  error: string,
  messages: {
    customAgentDirectoryRequired: string;
    failed: string;
    required: string;
    unavailable: string;
  }
): string => {
  if (error === "customAgentDirectoryRequired") {
    return messages.customAgentDirectoryRequired;
  }

  if (error === "required") {
    return messages.required;
  }

  if (error === "unavailable") {
    return messages.unavailable;
  }

  if (error === "failed") {
    return messages.failed;
  }

  return error;
};
