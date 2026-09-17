import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/dialog";
import React from "react";
import { useTranslation } from "react-i18next";

import { useTargetsPageContext } from "./targets-page-context";
import { TargetStatusBadge } from "./target-badges";

export const TargetsScanIssuesDialog = () => {
  const { t } = useTranslation();
  const page = useTargetsPageContext();
  const open = page.scanIssues.length > 0;

  return (
    <Modal
      open={open}
      onClose={() => page.setScanIssues([])}
      role="alertdialog"
      showClose={false}
      title={t("targets.scanIssues.title")}
      description={t("targets.scanIssues.description")}
      footer={
        <Button type="button" onClick={() => page.setScanIssues([])}>
          {t("targets.scanIssues.confirm")}
        </Button>
      }
    >
      <div className="grid gap-2">
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
    </Modal>
  );
};
