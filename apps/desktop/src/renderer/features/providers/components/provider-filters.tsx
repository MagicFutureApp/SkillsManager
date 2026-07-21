import {
  providerFilterOptions,
  providerStatusOptions,
  type ProviderFilter,
  type ProviderSort,
  type ProviderStatusFilter
} from "./provider-data";
import { Field, FieldLabel } from "@/components/ui/field";
import { Select, type SelectOption } from "@/components/ui/select";
import React from "react";

type ProviderFiltersProps = {
  copy: {
    ariaLabel: string;
    provider: string;
    sort: string;
    sortName: string;
    sortPriority: string;
    sortProvider: string;
    sortStatus: string;
    status: string;
  };
  provider: ProviderFilter;
  sort: ProviderSort;
  status: ProviderStatusFilter;
  onProviderChange: (value: ProviderFilter) => void;
  onSortChange: (value: ProviderSort) => void;
  onStatusChange: (value: ProviderStatusFilter) => void;
};

const FilterField = ({
  label,
  children
}: React.PropsWithChildren<{
  label: string;
}>) => {
  return (
    <Field>
      <FieldLabel>{label}</FieldLabel>
      {children}
    </Field>
  );
};

const providerSortOptions = (copy: ProviderFiltersProps["copy"]): SelectOption<ProviderSort>[] => [
  { value: "priority", label: copy.sortPriority },
  { value: "name", label: copy.sortName },
  { value: "status", label: copy.sortStatus },
  { value: "provider", label: copy.sortProvider }
];

export const ProviderFilters = ({
  copy,
  provider,
  sort,
  status,
  onProviderChange,
  onSortChange,
  onStatusChange
}: ProviderFiltersProps) => {
  return (
    <section
      className="grid grid-cols-3 items-end gap-3 rounded-xl border border-border bg-card p-4 max-[860px]:grid-cols-1"
      aria-label={copy.ariaLabel}
    >
      <FilterField label={copy.provider}>
        <Select value={provider} options={providerFilterOptions} onValueChange={onProviderChange} />
      </FilterField>
      <FilterField label={copy.status}>
        <Select value={status} options={providerStatusOptions} onValueChange={onStatusChange} />
      </FilterField>
      <FilterField label={copy.sort}>
        <Select value={sort} options={providerSortOptions(copy)} onValueChange={onSortChange} />
      </FilterField>
    </section>
  );
};
