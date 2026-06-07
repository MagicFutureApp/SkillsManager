import { Field as BaseField, FieldLabel } from "@/components/ui/field";
import { Select as BaseSelect, type SelectOption } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
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

type StaticSelectProps = {
  options: SelectOption<string>[];
  value: string;
};

export const StaticSelect = ({ options, value }: StaticSelectProps) => {
  return <BaseSelect value={value} options={options} onValueChange={() => undefined} />;
};

export const Toggle = ({ enabled }: { enabled: boolean }) => {
  return (
    <Switch
      checked={enabled}
      className="h-[22px] w-9"
      thumbClassName="size-4 data-checked:translate-x-3.5"
    />
  );
};
