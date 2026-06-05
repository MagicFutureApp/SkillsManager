import { cn } from "@/lib/utils";
import type { ProviderConnectionStatus } from "../../../../core/providers/provider-api";
import React from "react";

const statusClassName: Record<ProviderConnectionStatus, string> = {
  connected: "border-emerald-200 bg-emerald-50 text-emerald-700",
  error: "border-destructive/25 bg-destructive/10 text-destructive",
  review: "border-amber-200 bg-amber-50 text-amber-700"
};

export const ProviderStatusPill = ({ status }: { status: ProviderConnectionStatus }) => {
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
