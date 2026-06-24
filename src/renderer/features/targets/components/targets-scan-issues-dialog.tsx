import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";
import React from "react";
import { useTranslation } from "react-i18next";

import { useTargetsPageContext } from "./targets-page-context";
import { TargetStatusBadge } from "./targets-page-main";

export const TargetsScanIssuesDialog = () => {
  const { t } = useTranslation();
  const page = useTargetsPageContext();
  const open = page.scanIssues.length > 0;

  if (!open) {
    return null;
  }

  return (
    <AlertDialog open={open} onOpenChange={(nextOpen) => !nextOpen && page.setScanIssues([])}>
      <AlertDialogContent className="max-h-[80vh] overflow-hidden" size="default">
        <AlertDialogHeader>
          <AlertDialogTitle>{t("targets.scanIssues.title")}</AlertDialogTitle>
          <AlertDialogDescription>{t("targets.scanIssues.description")}</AlertDialogDescription>
        </AlertDialogHeader>
        <div className="grid max-h-[48vh] gap-2 overflow-y-auto pr-1">
          {page.scanIssues.map((issue) => (
            <div key={issue.id} className="rounded-lg border border-border bg-muted/40 p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <strong className="block truncate text-sm">{issue.name}</strong>
                  <span className="mt-1 block truncate font-mono text-xs text-muted-foreground">
                    {issue.path}
                  </span>
                </div>
                <TargetStatusBadge status={issue.status} />
              </div>
              <p className="mt-2 text-sm leading-5 text-muted-foreground">{issue.message}</p>
            </div>
          ))}
        </div>
        <AlertDialogFooter>
          <AlertDialogAction onClick={() => page.setScanIssues([])}>
            {t("targets.scanIssues.confirm")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
