import { Modal } from "@/components/ui/dialog";
import { LoaderCircle } from "lucide-react";
import React from "react";
import { useTranslation } from "react-i18next";

import { useTargetsPageContext } from "./targets-page-context";

export const TargetsScanLoadingDialog = () => {
  const { t } = useTranslation();
  const page = useTargetsPageContext();

  return (
    <Modal
      open={page.isRefreshingTargets}
      onClose={() => undefined}
      showClose={false}
      title={t("targets.scanLoading.title")}
      description={t("targets.scanLoading.description")}
      icon={
        <span
          role="status"
          aria-label={t("targets.scanLoading.title")}
          className="flex size-9 shrink-0 items-center justify-center rounded-full border border-border bg-muted"
        >
          <LoaderCircle className="size-5 animate-spin text-muted-foreground" />
        </span>
      }
    />
  );
};
