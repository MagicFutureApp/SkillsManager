import {
  Dialog,
  DialogBackdrop,
  DialogDescription,
  DialogPopup,
  DialogPortal,
  DialogTitle
} from "@/components/ui/dialog";
import { LoaderCircle } from "lucide-react";
import React from "react";
import { useTranslation } from "react-i18next";

import { useTargetsPageContext } from "./targets-page-context";

export const TargetsScanLoadingDialog = () => {
  const { t } = useTranslation();
  const page = useTargetsPageContext();

  if (!page.isRefreshingTargets) {
    return null;
  }

  return (
    <Dialog open={page.isRefreshingTargets}>
      <DialogPortal>
        <DialogBackdrop />
        <DialogPopup className="max-w-[360px]">
          <div className="flex items-start gap-3">
            <div
              role="status"
              aria-label={t("targets.scanLoading.title")}
              className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full border border-border bg-muted"
            >
              <LoaderCircle className="size-5 animate-spin text-muted-foreground" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-lg">{t("targets.scanLoading.title")}</DialogTitle>
              <DialogDescription>{t("targets.scanLoading.description")}</DialogDescription>
            </div>
          </div>
        </DialogPopup>
      </DialogPortal>
    </Dialog>
  );
};
