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
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { FolderOpen } from "lucide-react";
import React from "react";
import { useTranslation } from "react-i18next";

import { useTargetsPageContext } from "./targets-page-context";

export const TargetsPageModal = () => {
  const { t } = useTranslation();
  const page = useTargetsPageContext();

  if (!page.isAddTargetDialogOpen) {
    return null;
  }

  const submitForm = () => {
    void page.saveAddTarget();
  };

  const errorMessage = getAddTargetErrorMessage(page.addTargetError, {
    failed: t("targets.modal.saveError"),
    required: t("targets.modal.requiredError"),
    unavailable: t("targets.actions.addTargetUnavailable")
  });

  return (
    <Dialog
      open={page.isAddTargetDialogOpen}
      onOpenChange={(nextOpen) => !nextOpen && page.closeAddTargetDialog()}
    >
      <DialogPortal>
        <DialogBackdrop />
        <DialogPopup>
          <Form onFormSubmit={submitForm}>
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <DialogTitle>{t("targets.modal.title")}</DialogTitle>
                <DialogDescription>{t("targets.modal.description")}</DialogDescription>
              </div>
              <DialogClose
                render={
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={page.isSavingTarget}
                  />
                }
              >
                {t("targets.modal.close")}
              </DialogClose>
            </div>

            <div className="grid gap-3">
              <Field>
                <FieldLabel>{t("targets.modal.path")}</FieldLabel>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    className="min-w-0 flex-1"
                    disabled={page.isSavingTarget}
                    value={page.addTargetPath}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10"
                    disabled={page.isSavingTarget || !window.skillsManager?.selectTargetDirectory}
                    onClick={() => void page.selectTargetPath()}
                  >
                    <FolderOpen data-icon="inline-start" />
                    {t("targets.modal.browse")}
                  </Button>
                </div>
              </Field>

              {page.pendingTargetAgentDirectory ? (
                <Field>
                  <FieldLabel>{t("targets.modal.agentType")}</FieldLabel>
                  <FieldDescription>{t("targets.modal.agentTypeDescription")}</FieldDescription>
                  <div className="rounded-lg border border-border bg-muted/30 p-3">
                    <div className="min-w-0">
                      <p className="text-[11px] font-medium text-muted-foreground">
                        {t("targets.modal.selectedDirectory")}
                      </p>
                      <p className="mt-1 break-all text-xs font-normal text-foreground">
                        {page.pendingTargetAgentDirectory.basePath}
                      </p>
                    </div>
                    <div
                      role="radiogroup"
                      aria-label={t("targets.modal.agentType")}
                      className="mt-3 grid grid-cols-3 gap-2"
                    >
                      {page.pendingTargetAgentDirectory.options.map((option) => {
                        const isSelected = page.selectedTargetAgentType === option.type;

                        return (
                          <Button
                            key={option.type}
                            type="button"
                            role="radio"
                            aria-checked={isSelected}
                            variant={isSelected ? "secondary" : "outline"}
                            className="h-8 min-w-0 px-2"
                            disabled={page.isSavingTarget}
                            onClick={() => page.selectTargetAgentDirectoryOption(option)}
                          >
                            <span className="truncate">{option.name}</span>
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                </Field>
              ) : null}

              <Field>
                <FieldLabel>{t("targets.modal.name")}</FieldLabel>
                <Input
                  disabled={page.isSavingTarget}
                  value={page.addTargetName}
                  onValueChange={page.setPendingTargetName}
                />
              </Field>
            </div>

            {errorMessage ? <p className="mt-3 text-sm text-destructive">{errorMessage}</p> : null}

            <div className="mt-4 flex justify-end gap-2">
              <DialogClose
                render={<Button type="button" variant="outline" disabled={page.isSavingTarget} />}
              >
                {t("targets.modal.cancel")}
              </DialogClose>
              <Button type="submit" disabled={page.isSavingTarget}>
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
  messages: { failed: string; required: string; unavailable: string }
): string => {
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
