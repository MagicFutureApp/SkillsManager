import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, type SelectOption } from "@/components/ui/select";
import { shouldIgnoreRowSelection } from "@/lib/row-selection";
import { cn } from "@/lib/utils";
import React from "react";
import { useTranslation } from "react-i18next";

import { useTargetsPageContext } from "./targets-page-context";
import type { TargetSort, TargetStatus } from "./targets-page-data";

const tableGridColumnsClassName = "grid-cols-[minmax(0,1fr)_minmax(0,1.8fr)_minmax(72px,0.45fr)]";

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
            <Button type="button" variant="outline" onClick={page.refreshTargets}>
              {t("targets.actions.rescan")}
            </Button>
            <Button type="button" disabled title={t("targets.actions.addTargetUnavailable")}>
              {t("targets.actions.addTarget")}
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

      <section className="mt-5 overflow-hidden rounded-xl border border-border bg-card">
        <div
          aria-label={t("targets.table.headerAriaLabel")}
          className={cn(
            "grid items-center gap-3 border-b border-border bg-muted/40 px-4 py-3 text-xs font-semibold text-muted-foreground max-[820px]:hidden",
            tableGridColumnsClassName
          )}
        >
          <span>{t("targets.table.target")}</span>
          <span>{t("targets.table.path")}</span>
          <span>{t("targets.table.skills")}</span>
        </div>

        {page.visibleTargets.length ? (
          page.visibleTargets.map((target) => (
            <div
              key={target.id}
              className={cn(
                "grid cursor-pointer items-center gap-3 border-b border-border px-4 py-3 transition-colors hover:bg-muted/30 last:border-b-0 max-[820px]:grid-cols-[minmax(0,1fr)_auto]",
                tableGridColumnsClassName,
                target.id === page.selectedTargetId &&
                  "bg-primary/5 shadow-[inset_3px_0_0_theme(colors.primary)]"
              )}
              onClick={(event) => {
                if (shouldIgnoreRowSelection(event)) {
                  return;
                }

                page.setSelectedTargetId(target.id);
              }}
            >
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
              <span className="truncate font-mono text-sm">{target.path}</span>
              <span className="text-sm">
                {t("targets.table.skillCount", { count: target.skillCount })}
              </span>
            </div>
          ))
        ) : (
          <div className="px-4 py-9 text-center text-sm text-muted-foreground">
            {t("targets.empty")}
          </div>
        )}
      </section>
    </>
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
  detected: "border-emerald-200 bg-emerald-50 text-emerald-700",
  disabled: "border-slate-200 bg-slate-50 text-slate-600",
  missing: "border-amber-200 bg-amber-50 text-amber-700",
  registered: "border-blue-200 bg-blue-50 text-blue-700"
};
