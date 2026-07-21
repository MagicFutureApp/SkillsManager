import { Form } from "@base-ui/react/form";
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
import React from "react";
import { useTranslation } from "react-i18next";

import { TargetDirectorySelector } from "./target-directory-selector";
import type { TargetAddDialogState } from "../hooks/use-target-add-dialog-state";

type TargetAddDialogProps = {
  description: string;
  state: TargetAddDialogState;
  title: string;
};

export const TargetAddDialog = ({ description, state, title }: TargetAddDialogProps) => {
  const { t } = useTranslation();

  if (!state.isAddTargetDialogOpen) {
    return null;
  }

  const submitForm = () => {
    void state.saveAddTarget();
  };

  const errorMessage = getAddTargetErrorMessage(state.addTargetError, {
    customAgentDirectoryRequired: t("targets.modal.customAgentFolderRequiredError"),
    failed: t("targets.modal.saveError"),
    required: t("targets.modal.requiredError"),
    unavailable: t("targets.actions.addTargetUnavailable")
  });

  return (
    <Dialog
      open={state.isAddTargetDialogOpen}
      onOpenChange={(nextOpen) => !nextOpen && state.closeAddTargetDialog()}
    >
      <DialogPortal>
        <DialogBackdrop />
        <DialogPopup>
          <Form onFormSubmit={submitForm}>
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <DialogTitle>{title}</DialogTitle>
                <DialogDescription>{description}</DialogDescription>
              </div>
              <DialogClose
                render={
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={state.isSavingTarget}
                  />
                }
              >
                {t("targets.modal.close")}
              </DialogClose>
            </div>

            <div className="grid gap-3">
              <TargetDirectorySelector
                customAgentDirectoryName={state.customTargetAgentDirectoryName}
                disabled={state.isSavingTarget}
                isCustomAgentDirectorySelected={state.isCustomTargetAgentDirectorySelected}
                onBrowse={() => void state.selectTargetPath()}
                onCustomAgentDirectoryNameChange={state.setCustomTargetAgentDirectoryName}
                onSelectAgentDirectoryOption={state.selectTargetAgentDirectoryOption}
                onSelectCustomAgentDirectoryOption={state.selectCustomTargetAgentDirectoryOption}
                path={state.addTargetPath}
                pathLabel={t("targets.modal.path")}
                pendingDirectory={state.pendingTargetAgentDirectory}
                selectedAgentType={state.selectedTargetAgentType}
              />

              <Field>
                <FieldLabel>{t("targets.modal.name")}</FieldLabel>
                <Input
                  disabled={state.isSavingTarget}
                  value={state.addTargetName}
                  onValueChange={state.setPendingTargetName}
                />
              </Field>
            </div>

            {errorMessage ? <p className="mt-3 text-sm text-destructive">{errorMessage}</p> : null}

            <div className="mt-4 flex justify-end gap-2">
              <DialogClose
                render={<Button type="button" variant="outline" disabled={state.isSavingTarget} />}
              >
                {t("targets.modal.cancel")}
              </DialogClose>
              <Button type="submit" disabled={state.isSavingTarget}>
                {t("targets.modal.save")}
              </Button>
            </div>
          </Form>
        </DialogPopup>
      </DialogPortal>
    </Dialog>
  );
};

const getAddTargetErrorMessage = (
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
