import { cn } from "@/lib/utils";
import React from "react";

import type { SkillStatus } from "./skills-page-data";

export const statusClassName: Record<SkillStatus, string> = {
  installed: "border-emerald-200 bg-emerald-50 text-emerald-700",
  ready: "border-border bg-background text-muted-foreground",
  review: "border-amber-200 bg-amber-50 text-amber-700"
};

export const Field = ({
  label,
  children
}: React.PropsWithChildren<{
  label: string;
}>) => {
  return (
    <label className="grid gap-1.5 text-xs font-semibold text-muted-foreground">
      {label}
      {children}
    </label>
  );
};

export const Select = ({ children }: React.PropsWithChildren) => {
  return (
    <select className="h-10 rounded-lg border border-input bg-background px-3 text-sm font-normal text-foreground outline-none focus:border-ring">
      {children}
    </select>
  );
};

export const Toggle = ({ enabled }: { enabled: boolean }) => {
  return (
    <span
      className={cn(
        "inline-flex h-[22px] w-9 items-center rounded-full border p-0.5",
        enabled ? "border-primary bg-primary" : "border-border bg-muted"
      )}
      role="switch"
      aria-checked={enabled}
    >
      <span
        className={cn(
          "size-4 rounded-full border bg-background transition-transform",
          enabled ? "translate-x-3.5 border-primary-foreground" : "translate-x-0 border-border"
        )}
      />
    </span>
  );
};
