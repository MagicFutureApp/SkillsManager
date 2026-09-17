import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/dialog";
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
      <Modal
        open={page.isConvertDialogOpen}
        onClose={page.closeConvertDialog}
        showClose={false}
        title={t("targets.convertDialog.title")}
        description={
          count > 0
            ? t("targets.convertDialog.keptRelationships", { count })
            : t("targets.convertDialog.noRelationships")
        }
        footer={
          <Button type="button" onClick={page.closeConvertDialog}>
            {t("targets.convertDialog.close")}
          </Button>
        }
      />
    );
  }

  const target = page.pendingConvertTarget;

  if (!target) {
    return null;
  }

  const skillCount = target.skillCount ?? 0;

  return (
    <Modal
      open={page.isConvertDialogOpen}
      onClose={page.closeConvertDialog}
      title={t("targets.convertDialog.title")}
      description={t("targets.convertDialog.description")}
      error={page.convertTargetError}
      footer={
        <>
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
        </>
      }
    >
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
    </Modal>
  );
};
