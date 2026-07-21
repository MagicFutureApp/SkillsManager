import {
  repositoryProviderOptions,
  repositoryStatusOptions,
  type RepositoryProviderFilter,
  type RepositorySort,
  type RepositoryStatusFilter
} from "./repository-data";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, type SelectOption } from "@/components/ui/select";
import React from "react";

type RepositoryFiltersProps = {
  copy: {
    ariaLabel: string;
    allProviders: string;
    allStatuses: string;
    provider: string;
    search: string;
    searchPlaceholder: string;
    sort: string;
    sortName: string;
    sortProvider: string;
    sortSkills: string;
    sortStatus: string;
    status: string;
    statusLabels: Record<Exclude<RepositoryStatusFilter, "all">, string>;
  };
  provider: RepositoryProviderFilter;
  query: string;
  sort: RepositorySort;
  status: RepositoryStatusFilter;
  onProviderChange: (value: RepositoryProviderFilter) => void;
  onQueryChange: (value: string) => void;
  onSortChange: (value: RepositorySort) => void;
  onStatusChange: (value: RepositoryStatusFilter) => void;
};

const repositorySortOptions = (
  copy: RepositoryFiltersProps["copy"]
): SelectOption<RepositorySort>[] => [
  { value: "name", label: copy.sortName },
  { value: "provider", label: copy.sortProvider },
  { value: "status", label: copy.sortStatus },
  { value: "skills", label: copy.sortSkills }
];

const repositoryProviderSelectOptions = (
  copy: RepositoryFiltersProps["copy"]
): SelectOption<RepositoryProviderFilter>[] =>
  repositoryProviderOptions.map((option) => ({
    value: option.value,
    label: option.value === "all" ? copy.allProviders : option.label
  }));

const repositoryStatusSelectOptions = (
  copy: RepositoryFiltersProps["copy"]
): SelectOption<RepositoryStatusFilter>[] =>
  repositoryStatusOptions.map((status) => ({
    value: status,
    label: status === "all" ? copy.allStatuses : copy.statusLabels[status]
  }));

export const RepositoryFilters = ({
  copy,
  provider,
  query,
  sort,
  status,
  onProviderChange,
  onQueryChange,
  onSortChange,
  onStatusChange
}: RepositoryFiltersProps) => {
  return (
    <section
      className="grid grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))] items-end gap-3 rounded-xl border border-border bg-card p-4 max-[1180px]:grid-cols-2"
      aria-label={copy.ariaLabel}
    >
      <FilterField label={copy.search}>
        <Input
          type="search"
          value={query}
          placeholder={copy.searchPlaceholder}
          onValueChange={onQueryChange}
        />
      </FilterField>
      <FilterField label={copy.sort}>
        <Select value={sort} options={repositorySortOptions(copy)} onValueChange={onSortChange} />
      </FilterField>
      <FilterField label={copy.provider}>
        <Select
          value={provider}
          options={repositoryProviderSelectOptions(copy)}
          onValueChange={onProviderChange}
        />
      </FilterField>
      <FilterField label={copy.status}>
        <Select
          value={status}
          options={repositoryStatusSelectOptions(copy)}
          onValueChange={onStatusChange}
        />
      </FilterField>
    </section>
  );
};

const FilterField = ({ children, label }: React.PropsWithChildren<{ label: string }>) => {
  return (
    <Field>
      <FieldLabel>{label}</FieldLabel>
      {children}
    </Field>
  );
};
