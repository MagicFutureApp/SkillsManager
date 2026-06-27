import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";
import React from "react";
import { useTranslation } from "react-i18next";

import { useTargetsPageContext } from "./targets-page-context";

export const TargetsDeleteDialog = () => {
  const { t } = useTranslation();
  const page = useTargetsPageContext();

  if (!page.isDeleteDialogOpen) {
    return null;
  }

  return (
    <AlertDialog
      open={page.isDeleteDialogOpen}
      onOpenChange={(nextOpen) => !nextOpen && page.closeDeleteDialog()}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("targets.deleteDialog.title")}</AlertDialogTitle>
          <AlertDialogDescription>{t("targets.deleteDialog.description")}</AlertDialogDescription>
        </AlertDialogHeader>

        <div className="grid gap-3">
          <p className="text-sm font-medium">
            {page.pendingDeleteTargets.length === 1
              ? page.pendingDeleteTargets[0]?.name
              : t("targets.deleteDialog.batchSummary", {
                  count: page.pendingDeleteTargets.length
                })}
          </p>

          {page.pendingDeleteTargets.length > 1 ? (
            <ul className="max-h-44 overflow-auto rounded-lg border border-border">
              {page.pendingDeleteTargets.map((target) => (
                <li
                  key={target.id}
                  className="border-b border-border px-3 py-2 text-sm last:border-b-0"
                >
                  <span className="block truncate font-medium">{target.name}</span>
                  <span className="mt-1 block truncate font-mono text-xs text-muted-foreground">
                    {target.path}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}

          {page.deleteError ? <p className="text-sm text-destructive">{page.deleteError}</p> : null}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={page.isDeletingTargets}>
            {t("targets.deleteDialog.cancel")}
          </AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={page.isDeletingTargets}
            onClick={page.confirmDeleteTargets}
          >
            {t("targets.deleteDialog.confirm")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
