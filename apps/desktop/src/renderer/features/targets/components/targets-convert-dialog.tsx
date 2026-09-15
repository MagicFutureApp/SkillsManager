import { CheckCircle2 } from "lucide-react";
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
import React from "react";
import { useTranslation } from "react-i18next";

import { useTargetsPageContext } from "./targets-page-context";

export const TargetsConvertDialog = () => {
  const { t } = useTranslation();
  const page = useTargetsPageContext();

  if (!page.isConvertDialogOpen) {
    return null;
  }

  if (page.isConvertSuccess) {
    const count = page.convertedSkillCount;

    return (
      <Dialog
        open={page.isConvertDialogOpen}
        onOpenChange={(nextOpen) => !nextOpen && page.closeConvertDialog()}
      >
        <DialogPortal>
          <DialogBackdrop />
          <DialogPopup>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600" aria-hidden="true" />
              <div className="min-w-0">
                <DialogTitle>{t("targets.convertDialog.title")}</DialogTitle>
                <DialogDescription>
                  {count > 0
                    ? t("targets.convertDialog.keptRelationships", { count })
                    : t("targets.convertDialog.noRelationships")}
                </DialogDescription>
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <Button type="button" onClick={page.closeConvertDialog}>
                {t("targets.convertDialog.close")}
              </Button>
            </div>
          </DialogPopup>
        </DialogPortal>
      </Dialog>
    );
  }

  const target = page.pendingConvertTarget;

  if (!target) {
    return null;
  }

  const skillCount = target.skillCount ?? 0;

  return (
    <Dialog
      open={page.isConvertDialogOpen}
      onOpenChange={(nextOpen) => !nextOpen && page.closeConvertDialog()}
    >
      <DialogPortal>
        <DialogBackdrop />
        <DialogPopup>
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <DialogTitle>{t("targets.convertDialog.title")}</DialogTitle>
              <DialogDescription>{t("targets.convertDialog.description")}</DialogDescription>
            </div>
            <DialogClose
              disabled={page.isConvertingTarget}
              render={<Button type="button" variant="outline" size="sm" />}
            >
              {t("targets.convertDialog.close")}
            </DialogClose>
          </div>

          <div className="grid gap-2 rounded-lg border border-border bg-background px-3 py-2.5">
            <span className="text-xs font-semibold text-muted-foreground">
              {t("targets.convertDialog.target")}
            </span>
            <div className="min-w-0 text-sm">
              <p className="mt-0.5 break-words font-medium leading-5" title={target.name}>
                {target.name}
              </p>
              <span
                className="mt-0.5 block break-all font-mono text-xs leading-5 text-muted-foreground"
                title={target.path}
              >
                {target.path}
              </span>
            </div>
          </div>

          <p className="mt-3 text-sm text-muted-foreground">
            {skillCount > 0
              ? t("targets.convertDialog.willKeepRelationships", { count: skillCount })
              : t("targets.convertDialog.noRelationships")}
          </p>

          {page.convertTargetError ? (
            <p className="mt-3 text-sm text-destructive">{page.convertTargetError}</p>
          ) : null}

          <div className="mt-4 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={page.isConvertingTarget}
              onClick={page.closeConvertDialog}
            >
              {t("targets.convertDialog.cancel")}
            </Button>
            <Button
              type="button"
              disabled={page.isConvertingTarget}
              onClick={page.convertTargetToGlobal}
            >
              {t("targets.convertDialog.confirm")}
            </Button>
          </div>
        </DialogPopup>
      </DialogPortal>
    </Dialog>
  );
};
