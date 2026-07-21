import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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

export const TargetsDeleteDialog = () => {
  const { t } = useTranslation();
  const page = useTargetsPageContext();
  const [deleteInstalledFiles, setDeleteInstalledFiles] = React.useState(false);

  React.useEffect(() => {
    if (page.isDeleteDialogOpen) {
      setDeleteInstalledFiles(false);
    }
  }, [page.isDeleteDialogOpen]);

  if (!page.isDeleteDialogOpen) {
    return null;
  }

  return (
    <Dialog
      open={page.isDeleteDialogOpen}
      onOpenChange={(nextOpen) => !nextOpen && page.closeDeleteDialog()}
    >
      <DialogPortal>
        <DialogBackdrop />
        <DialogPopup>
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <DialogTitle>{t("targets.deleteDialog.title")}</DialogTitle>
              <DialogDescription>{t("targets.deleteDialog.description")}</DialogDescription>
            </div>
            <DialogClose
              disabled={page.isDeletingTargets}
              render={<Button type="button" variant="outline" size="sm" />}
            >
              {t("targets.deleteDialog.close")}
            </DialogClose>
          </div>

          <div className="grid gap-2 rounded-lg border border-border bg-background px-3 py-2.5">
            <span className="text-xs font-semibold text-muted-foreground">
              {t("targets.deleteDialog.target")}
            </span>
            {page.pendingDeleteTargets.length === 1 ? (
              <TargetDeleteDialogItem target={page.pendingDeleteTargets[0]} />
            ) : (
              <>
                <p className="text-sm font-medium">
                  {t("targets.deleteDialog.batchSummary", {
                    count: page.pendingDeleteTargets.length
                  })}
                </p>
                <ul className="max-h-44 overflow-auto rounded-lg border border-border">
                  {page.pendingDeleteTargets.map((target) => (
                    <li
                      key={target.id}
                      className="border-b border-border px-3 py-2 text-sm last:border-b-0"
                    >
                      <TargetDeleteDialogItem target={target} />
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>

          {page.deleteError ? (
            <p className="mt-3 text-sm text-destructive">{page.deleteError}</p>
          ) : null}

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div
              role="group"
              aria-label={t("targets.deleteDialog.options")}
              className="flex flex-wrap items-center gap-x-4 gap-y-2"
            >
              <div className="flex items-center gap-2 text-sm font-medium">
                <Checkbox
                  checked={deleteInstalledFiles}
                  disabled={page.isDeletingTargets}
                  aria-label={t("targets.deleteDialog.deleteSkillFiles")}
                  onCheckedChange={(nextChecked) => setDeleteInstalledFiles(Boolean(nextChecked))}
                />
                <span>{t("targets.deleteDialog.deleteSkillFiles")}</span>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={page.isDeletingTargets}
                onClick={page.closeDeleteDialog}
              >
                {t("targets.deleteDialog.cancel")}
              </Button>
              <Button
                type="button"
                disabled={page.isDeletingTargets}
                onClick={() => page.confirmDeleteTargets({ deleteInstalledFiles })}
              >
                {t("targets.deleteDialog.confirm")}
              </Button>
            </div>
          </div>
        </DialogPopup>
      </DialogPortal>
    </Dialog>
  );
};

type TargetDeleteDialogItemProps = {
  target: {
    name: string;
    path: string;
  };
};

const TargetDeleteDialogItem = ({ target }: TargetDeleteDialogItemProps) => {
  return (
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
  );
};
