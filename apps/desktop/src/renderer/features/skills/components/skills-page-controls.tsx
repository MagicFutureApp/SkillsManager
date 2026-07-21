import { Field as BaseField, FieldLabel } from "@/components/ui/field";
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
    <BaseField>
      <FieldLabel>{label}</FieldLabel>
      {children}
    </BaseField>
  );
};
