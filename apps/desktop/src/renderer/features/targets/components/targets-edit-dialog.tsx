import { Form } from "@base-ui/react/form";
import React from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBackdrop,
  DialogClose,
  DialogDescription,
  DialogPopup,
  DialogPortal,
  DialogTitle
} from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

import { TargetDirectorySelector } from "./target-directory-selector";
import { useTargetsPageContext } from "./targets-page-context";

export const TargetsEditDialog = () => {
  const { t } = useTranslation();
  const page = useTargetsPageContext();

  if (!page.isEditTargetDialogOpen) {
    return null;
  }

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
    <Dialog
      open={page.isEditTargetDialogOpen}
      onOpenChange={(nextOpen) => !nextOpen && page.closeEditTargetDialog()}
    >
      <DialogPortal>
        <DialogBackdrop />
        <DialogPopup>
          <Form onFormSubmit={submitForm}>
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <DialogTitle>{t("targets.editDialog.title")}</DialogTitle>
                <DialogDescription>{t("targets.editDialog.description")}</DialogDescription>
              </div>
              <DialogClose
                render={
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={page.isSavingEditTarget}
                  />
                }
              >
                {t("targets.editDialog.close")}
              </DialogClose>
            </div>

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

            {errorMessage ? <p className="mt-3 text-sm text-destructive">{errorMessage}</p> : null}

            <div className="mt-4 flex justify-end gap-2">
              <DialogClose
                render={
                  <Button type="button" variant="outline" disabled={page.isSavingEditTarget} />
                }
              >
                {t("targets.editDialog.cancel")}
              </DialogClose>
              <Button type="submit" disabled={page.isSavingEditTarget}>
                {t("targets.editDialog.save")}
              </Button>
            </div>
          </Form>
        </DialogPopup>
      </DialogPortal>
    </Dialog>
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
