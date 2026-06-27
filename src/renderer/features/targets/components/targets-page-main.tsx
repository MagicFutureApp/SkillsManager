import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableEmptyRow,
  DataTableHead,
  DataTableHeader,
  DataTableRow
} from "@/components/data-table";
import { Input } from "@/components/ui/input";
import { Select, type SelectOption } from "@/components/ui/select";
import { shouldIgnoreRowSelection } from "@/lib/row-selection";
import { cn } from "@/lib/utils";
import { Trash2 } from "lucide-react";
import React from "react";
import { useTranslation } from "react-i18next";

import type { TargetScope, TargetSort, TargetStatus } from "./targets-page-data";
import { useTargetsPageContext } from "./targets-page-context";

export const TargetsPageMain = () => {
  const { t } = useTranslation();
  const page = useTargetsPageContext();
  const sortOptions: SelectOption<TargetSort>[] = [
    { value: "name", label: t("targets.filters.sortName") },
    { value: "skills", label: t("targets.filters.sortSkills") }
  ];

  return (
    <>
      <header className="mb-6">
        <div className="flex items-center justify-between gap-4 max-[860px]:items-start">
          <div className="min-w-0">
            <h1 className="text-[28px] font-semibold leading-tight">{t("targets.heading")}</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              {t("targets.description")}
            </p>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              disabled={
                page.isRefreshingTargets ||
                !window.skillsManager?.selectTargetDirectory ||
                !window.skillsManager?.addCustomDirectoryTarget
              }
              title={
                window.skillsManager?.selectTargetDirectory &&
                window.skillsManager?.addCustomDirectoryTarget
                  ? undefined
                  : t("targets.actions.addTargetUnavailable")
              }
              onClick={page.openAddTargetDialog}
            >
              {t("targets.actions.addTarget")}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={page.isRefreshingTargets}
              onClick={page.refreshTargets}
            >
              {t("targets.actions.rescan")}
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={page.checkedCount === 0 || page.isDeletingTargets}
              onClick={page.openCheckedDeleteDialog}
            >
              {t("targets.actions.deleteSelected")}
            </Button>
          </div>
        </div>
      </header>

      <section
        className="grid grid-cols-[minmax(0,2fr)_minmax(180px,0.7fr)] items-end gap-3 rounded-xl border border-border bg-card p-4"
        aria-label={t("targets.filters.ariaLabel")}
      >
        <label className="grid gap-2 text-xs font-semibold text-muted-foreground">
          {t("targets.filters.search")}
          <Input
            type="search"
            value={page.query}
            placeholder={t("targets.filters.searchPlaceholder")}
            onValueChange={page.setQuery}
          />
        </label>
        <label className="grid gap-2 text-xs font-semibold text-muted-foreground">
          {t("targets.filters.sort")}
          <Select value={page.sort} options={sortOptions} onValueChange={page.setSort} />
        </label>
      </section>

      <DataTable containerClassName="mt-5">
        <DataTableHeader className="max-[820px]:hidden">
          <DataTableRow>
            <DataTableHead className="w-[42px]">
              <span className="grid place-items-center">
                <Checkbox
                  checked={page.visibleAllChecked}
                  indeterminate={page.visibleSomeChecked && !page.visibleAllChecked}
                  disabled={!page.visibleTargets.some((target) => target.deletable)}
                  aria-label={t("targets.table.selectAll")}
                  onCheckedChange={page.selectAllVisibleDeletable}
                />
              </span>
            </DataTableHead>
            <DataTableHead className="w-[28%]">{t("targets.table.target")}</DataTableHead>
            <DataTableHead>{t("targets.table.path")}</DataTableHead>
            <DataTableHead className="w-[96px]">{t("targets.table.scope")}</DataTableHead>
            <DataTableHead className="w-[120px]">{t("targets.table.skills")}</DataTableHead>
            <DataTableHead className="w-[72px]">{t("targets.table.actions")}</DataTableHead>
          </DataTableRow>
        </DataTableHeader>

        <DataTableBody>
          {page.visibleTargets.length ? (
            page.visibleTargets.map((target) => (
              <DataTableRow
                key={target.id}
                className="cursor-pointer"
                selected={target.id === page.selectedTargetId}
                onClick={(event) => {
                  if (shouldIgnoreRowSelection(event)) {
                    return;
                  }

                  page.setSelectedTargetId(target.id);
                }}
              >
                <DataTableCell className="w-[42px]">
                  <span className="grid place-items-center">
                    {target.deletable ? (
                      <Checkbox
                        checked={page.checkedIds.has(target.id)}
                        aria-label={t("targets.table.selectTarget", { name: target.name })}
                        onCheckedChange={(checked) => page.toggleTargetChecked(target.id, checked)}
                      />
                    ) : null}
                  </span>
                </DataTableCell>
                <DataTableCell className="min-w-0">
                  <Button
                    type="button"
                    variant="ghost"
                    className="grid h-auto min-w-0 justify-start gap-1 px-0 py-0 text-left font-normal hover:bg-transparent focus-visible:ring-3 focus-visible:ring-ring/50"
                    aria-label={target.name}
                    aria-selected={target.id === page.selectedTargetId}
                    onClick={() => page.setSelectedTargetId(target.id)}
                  >
                    <strong className="block truncate text-sm">{target.name}</strong>
                    <span className="block truncate font-mono text-xs text-muted-foreground">
                      {target.type}
                    </span>
                  </Button>
                </DataTableCell>
                <DataTableCell className="truncate font-mono text-sm max-[820px]:hidden">
                  {target.path}
                </DataTableCell>
                <DataTableCell className="max-[820px]:hidden">
                  <TargetScopeBadge scope={target.scope} />
                </DataTableCell>
                <DataTableCell className="text-sm">
                  {t("targets.table.skillCount", { count: target.skillCount })}
                </DataTableCell>
                <DataTableCell className="w-[72px]">
                  {target.deletable ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      disabled={page.isDeletingTargets}
                      aria-label={t("targets.actions.deleteTarget", { name: target.name })}
                      onClick={() => page.openDeleteDialog([target.id])}
                    >
                      <Trash2 aria-hidden="true" />
                    </Button>
                  ) : null}
                </DataTableCell>
              </DataTableRow>
            ))
          ) : (
            <DataTableEmptyRow colSpan={6}>{t("targets.empty")}</DataTableEmptyRow>
          )}
        </DataTableBody>
      </DataTable>
    </>
  );
};

export const TargetScopeBadge = ({ scope }: { scope: TargetScope }) => {
  const { t } = useTranslation();

  return (
    <span
      className={cn(
        "inline-flex min-h-6 w-max items-center rounded-full border px-2 font-mono text-xs",
        scopeClassName[scope]
      )}
    >
      {t(`targets.scope.${scope}`)}
    </span>
  );
};

export const TargetStatusBadge = ({ status }: { status: TargetStatus }) => {
  const { t } = useTranslation();

  return (
    <span
      className={cn(
        "inline-flex min-h-6 items-center rounded-full border px-2 text-xs",
        statusClassName[status]
      )}
    >
      {t(`targets.status.${status}`)}
    </span>
  );
};

const statusClassName: Record<TargetStatus, string> = {
  "app-missing": "border-rose-200 bg-rose-50 text-rose-700",
  detected: "border-emerald-200 bg-emerald-50 text-emerald-700",
  disabled: "border-slate-200 bg-slate-50 text-slate-600",
  missing: "border-amber-200 bg-amber-50 text-amber-700",
  "not-directory": "border-rose-200 bg-rose-50 text-rose-700",
  "not-writable": "border-amber-200 bg-amber-50 text-amber-700",
  "path-missing": "border-amber-200 bg-amber-50 text-amber-700",
  "scan-error": "border-rose-200 bg-rose-50 text-rose-700",
  registered: "border-blue-200 bg-blue-50 text-blue-700"
};

const scopeClassName: Record<TargetScope, string> = {
  global: "border-emerald-200 bg-emerald-50 text-emerald-700",
  independent: "border-amber-200 bg-amber-50 text-amber-700"
};
