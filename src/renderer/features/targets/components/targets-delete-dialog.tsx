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
import { Checkbox } from "@/components/ui/checkbox";
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
          {page.pendingDeleteTargets.length === 1 ? (
            <TargetDeleteDialogItem target={page.pendingDeleteTargets[0]} />
          ) : (
            <p className="text-sm font-medium">
              {t("targets.deleteDialog.batchSummary", {
                count: page.pendingDeleteTargets.length
              })}
            </p>
          )}

          {page.pendingDeleteTargets.length > 1 ? (
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
          ) : null}

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

          {page.deleteError ? <p className="text-sm text-destructive">{page.deleteError}</p> : null}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={page.isDeletingTargets}>
            {t("targets.deleteDialog.cancel")}
          </AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={page.isDeletingTargets}
            onClick={() => page.confirmDeleteTargets({ deleteInstalledFiles })}
          >
            {t("targets.deleteDialog.confirm")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
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
      <span className="block truncate font-medium" title={target.name}>
        {target.name}
      </span>
      <span
        className="mt-1 block truncate font-mono text-xs text-muted-foreground"
        title={target.path}
      >
        {target.path}
      </span>
    </div>
  );
};
