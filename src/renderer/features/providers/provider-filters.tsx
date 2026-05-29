import {
  providerFilterOptions,
  providerStatusOptions,
  type ProviderFilter,
  type ProviderSort,
  type ProviderStatusFilter
} from "./provider-data";
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

const Field = ({
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

const selectClassName =
  "h-10 rounded-lg border border-input bg-background px-3 text-sm font-normal text-foreground outline-none focus:border-ring";

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
      <Field label={copy.provider}>
        <select
          className={selectClassName}
          value={provider}
          onChange={(event) => onProviderChange(event.target.value as ProviderFilter)}
        >
          {providerFilterOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </Field>
      <Field label={copy.status}>
        <select
          className={selectClassName}
          value={status}
          onChange={(event) => onStatusChange(event.target.value as ProviderStatusFilter)}
        >
          {providerStatusOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </Field>
      <Field label={copy.sort}>
        <select
          className={selectClassName}
          value={sort}
          onChange={(event) => onSortChange(event.target.value as ProviderSort)}
        >
          <option value="priority">{copy.sortPriority}</option>
          <option value="name">{copy.sortName}</option>
          <option value="status">{copy.sortStatus}</option>
          <option value="provider">{copy.sortProvider}</option>
        </select>
      </Field>
    </section>
  );
};
