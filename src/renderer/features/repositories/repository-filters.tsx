import {
  repositoryProviderOptions,
  repositoryStatusOptions,
  type RepositoryProviderFilter,
  type RepositorySort,
  type RepositoryStatusFilter
} from "./repository-data";
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
    sortPriority: string;
    sortProvider: string;
    sortSkills: string;
    sortStatus: string;
    status: string;
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

const controlClassName =
  "h-10 rounded-lg border border-input bg-background px-3 text-sm font-normal text-foreground outline-none focus:border-ring";

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
      className="grid grid-cols-[minmax(240px,1fr)_160px_150px_150px] items-end gap-3 rounded-xl border border-border bg-card p-4 max-[1180px]:grid-cols-2"
      aria-label={copy.ariaLabel}
    >
      <Field label={copy.search}>
        <input
          className={controlClassName}
          type="search"
          value={query}
          placeholder={copy.searchPlaceholder}
          onChange={(event) => onQueryChange(event.target.value)}
        />
      </Field>
      <Field label={copy.sort}>
        <select
          className={controlClassName}
          value={sort}
          onChange={(event) => onSortChange(event.target.value as RepositorySort)}
        >
          <option value="priority">{copy.sortPriority}</option>
          <option value="name">{copy.sortName}</option>
          <option value="provider">{copy.sortProvider}</option>
          <option value="status">{copy.sortStatus}</option>
          <option value="skills">{copy.sortSkills}</option>
        </select>
      </Field>
      <Field label={copy.provider}>
        <select
          className={controlClassName}
          value={provider}
          onChange={(event) => onProviderChange(event.target.value as RepositoryProviderFilter)}
        >
          {repositoryProviderOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.value === "all" ? copy.allProviders : option.label}
            </option>
          ))}
        </select>
      </Field>
      <Field label={copy.status}>
        <select
          className={controlClassName}
          value={status}
          onChange={(event) => onStatusChange(event.target.value as RepositoryStatusFilter)}
        >
          {repositoryStatusOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.value === "all" ? copy.allStatuses : option.label}
            </option>
          ))}
        </select>
      </Field>
    </section>
  );
};

const Field = ({ children, label }: React.PropsWithChildren<{ label: string }>) => {
  return (
    <label className="grid min-w-0 gap-1.5 text-xs font-semibold text-muted-foreground">
      {label}
      {children}
    </label>
  );
};
