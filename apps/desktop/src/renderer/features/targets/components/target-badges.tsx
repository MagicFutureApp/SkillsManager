import { cn } from "@/lib/utils";
import React from "react";
import { useTranslation } from "react-i18next";

import type { TargetScope, TargetStatus } from "./targets-page-data";

export const TargetScopeBadge = ({ scope }: { scope: TargetScope }) => {
  const { t } = useTranslation();

  return (
    <span
      className={cn(
        "inline-flex min-h-6 w-max items-center rounded-full border px-2 font-mono text-xs",
        scopeClassName[scope]
      )}
    >
      {t(`targets.scope.${scope}`)}
    </span>
  );
};

export const TargetStatusBadge = ({ status }: { status: TargetStatus }) => {
  const { t } = useTranslation();

  return (
    <span
      className={cn(
        "inline-flex min-h-6 items-center rounded-full border px-2 text-xs",
        statusClassName[status]
      )}
    >
      {t(`targets.status.${status}`)}
    </span>
  );
};

const statusClassName: Record<TargetStatus, string> = {
  "app-missing": "border-rose-200 bg-rose-50 text-rose-700",
  detected: "border-emerald-200 bg-emerald-50 text-emerald-700",
  disabled: "border-slate-200 bg-slate-50 text-slate-600",
  missing: "border-amber-200 bg-amber-50 text-amber-700",
  "not-directory": "border-rose-200 bg-rose-50 text-rose-700",
  "not-writable": "border-amber-200 bg-amber-50 text-amber-700",
  "path-missing": "border-amber-200 bg-amber-50 text-amber-700",
  "scan-error": "border-rose-200 bg-rose-50 text-rose-700",
  registered: "border-blue-200 bg-blue-50 text-blue-700"
};

const scopeClassName: Record<TargetScope, string> = {
  global: "border-emerald-200 bg-emerald-50 text-emerald-700",
  independent: "border-amber-200 bg-amber-50 text-amber-700"
};
