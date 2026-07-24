import { cn } from "@/lib/utils";
import type { RepositoryScanStatus } from "../../../../core/repositories/repository-api";
import React from "react";
import { useTranslation } from "react-i18next";

const statusClassName: Record<RepositoryScanStatus, string> = {
  failed: "border-destructive/25 bg-destructive/10 text-destructive",
  pending: "border-sky-200 bg-sky-50 text-sky-700",
  ready: "border-emerald-200 bg-emerald-50 text-emerald-700",
  review: "border-amber-200 bg-amber-50 text-amber-700"
};

export const RepositoryStatusPill = ({ status }: { status: RepositoryScanStatus }) => {
  const { t } = useTranslation();

  return (
    <span
      className={cn(
        "inline-flex min-h-6 w-max items-center rounded-full border px-2 text-xs",
        statusClassName[status]
      )}
    >
      {t(`repositories.status.${status}`)}
    </span>
  );
};
