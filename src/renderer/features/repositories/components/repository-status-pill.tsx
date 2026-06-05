import { cn } from "@/lib/utils";
import type { RepositoryScanStatus } from "../../../../core/repositories/repository-api";
import React from "react";

const statusClassName: Record<RepositoryScanStatus, string> = {
  failed: "border-destructive/25 bg-destructive/10 text-destructive",
  ready: "border-emerald-200 bg-emerald-50 text-emerald-700",
  review: "border-amber-200 bg-amber-50 text-amber-700"
};

export const RepositoryStatusPill = ({ status }: { status: RepositoryScanStatus }) => {
  return (
    <span
      className={cn(
        "inline-flex min-h-6 w-max items-center rounded-full border px-2 font-mono text-xs",
        statusClassName[status]
      )}
    >
      {status}
    </span>
  );
};
