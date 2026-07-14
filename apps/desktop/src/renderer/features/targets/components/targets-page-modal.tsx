import React from "react";
import { useTranslation } from "react-i18next";

import { TargetAddDialog } from "./target-add-dialog";
import { useTargetsPageContext } from "./targets-page-context";

export const TargetsPageModal = () => {
  const { t } = useTranslation();
  const page = useTargetsPageContext();

  return (
    <TargetAddDialog
      description={t("targets.modal.description")}
      state={page.addTargetDialog}
      title={t("targets.modal.title")}
    />
  );
};
