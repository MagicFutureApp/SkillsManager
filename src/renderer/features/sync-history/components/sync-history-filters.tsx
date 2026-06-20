import { Field as BaseField, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, type SelectOption } from "@/components/ui/select";
import React from "react";
import { useTranslation } from "react-i18next";

import type { SyncHistorySort, SyncHistoryStatusFilter } from "./sync-history-data";

type SyncHistoryFiltersProps = {
  query: string;
  sort: SyncHistorySort;
  status: SyncHistoryStatusFilter;
  onQueryChange: (query: string) => void;
  onSortChange: (sort: SyncHistorySort) => void;
  onStatusChange: (status: SyncHistoryStatusFilter) => void;
};

export const SyncHistoryFilters = ({
  query,
  sort,
  status,
  onQueryChange,
  onSortChange,
  onStatusChange
}: SyncHistoryFiltersProps) => {
  const { t } = useTranslation();
  const sortOptions: Array<SelectOption<SyncHistorySort>> = [
    { value: "newest", label: t("syncHistory.filters.sortNewest") },
    { value: "repository", label: t("syncHistory.filters.sortRepository") },
    { value: "status", label: t("syncHistory.filters.sortStatus") }
  ];
  const statusOptions: Array<SelectOption<SyncHistoryStatusFilter>> = [
    { value: "all", label: t("syncHistory.filters.allStatuses") },
    { value: "success", label: t("syncHistory.status.success") },
    { value: "failed", label: t("syncHistory.status.failed") },
    { value: "interrupted", label: t("syncHistory.status.interrupted") },
    { value: "running", label: t("syncHistory.status.running") }
  ];

  return (
    <section
      className="grid grid-cols-[minmax(0,2fr)_repeat(2,minmax(0,1fr))] items-end gap-3 rounded-xl border border-border bg-card p-4 max-[1180px]:grid-cols-2"
      aria-label={t("syncHistory.filters.ariaLabel")}
    >
      <Field label={t("syncHistory.filters.search")}>
        <Input
          type="search"
          value={query}
          placeholder={t("syncHistory.filters.searchPlaceholder")}
          onChange={(event) => onQueryChange(event.target.value)}
        />
      </Field>
      <Field label={t("syncHistory.filters.sort")}>
        <Select value={sort} options={sortOptions} onValueChange={onSortChange} />
      </Field>
      <Field label={t("syncHistory.filters.status")}>
        <Select value={status} options={statusOptions} onValueChange={onStatusChange} />
      </Field>
    </section>
  );
};

const Field = ({ label, children }: React.PropsWithChildren<{ label: string }>) => {
  return (
    <BaseField>
      <FieldLabel>{label}</FieldLabel>
      {children}
    </BaseField>
  );
};
