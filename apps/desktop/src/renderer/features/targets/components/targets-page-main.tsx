import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, type SelectOption } from "@/components/ui/select";
import React from "react";
import { useTranslation } from "react-i18next";

import { TargetList } from "./target-list";
import type { TargetSort } from "./targets-page-data";
import { useTargetsPageContext } from "./targets-page-context";

export const TargetsPageMain = () => {
  const { t } = useTranslation();
  const page = useTargetsPageContext();
  const scanActionLabel =
    page.hasLoadedTargets && page.targets.length === 0
      ? t("targets.actions.scan")
      : t("targets.actions.rescan");
  const sortOptions: SelectOption<TargetSort>[] = [
    { value: "name", label: t("targets.filters.sortName") },
    { value: "path", label: t("targets.filters.sortPath") },
    { value: "scope", label: t("targets.filters.sortScope") },
    { value: "skills", label: t("targets.filters.sortSkills") }
  ];

  return (
    <div className="flex h-full min-h-0 flex-col">
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
              {scanActionLabel}
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

      <TargetList />
    </div>
  );
};
