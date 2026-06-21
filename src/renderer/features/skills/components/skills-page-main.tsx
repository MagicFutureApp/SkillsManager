import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, type SelectOption } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import React from "react";
import { useTranslation } from "react-i18next";

import type { SkillRepositoryFilter, SkillSort, SkillStatusFilter } from "./skills-page-data";
import { skillStatusOptions } from "./skills-page-data";
import { Field, statusClassName, Toggle } from "./skills-page-controls";
import { useSkillsPageContext } from "./skills-page-context";

const tableGridColumnsClassName =
  "grid-cols-[32px_minmax(0,1.7fr)_minmax(0,0.9fr)_minmax(0,0.65fr)_minmax(0,0.75fr)_minmax(0,0.55fr)_minmax(44px,0.45fr)_minmax(56px,0.5fr)]";

export const SkillsPageMain = () => {
  const { t } = useTranslation();
  const page = useSkillsPageContext();
  const { selectedSkill, visibleSkills } = page;
  const hasVisibleSkills = visibleSkills.length > 0;
  const syncTitle = t("skills.actions.syncUnavailable");
  const syncLabel =
    page.checkedCount > 0
      ? t("skills.actions.syncSelected", { count: page.checkedCount })
      : t("skills.actions.sync");
  const sortOptions: SelectOption<SkillSort>[] = [
    { value: "recommended", label: t("skills.filters.sortRecommended") },
    { value: "name", label: t("skills.filters.sortName") },
    { value: "repository", label: t("skills.filters.sortRepository") }
  ];
  const repositoryOptions: SelectOption<SkillRepositoryFilter>[] = page.repositoryOptions.map(
    (repository) => ({
      value: repository,
      label: repository === "all" ? t("skills.filters.allRepositories") : repository
    })
  );
  const statusOptions: SelectOption<SkillStatusFilter>[] = skillStatusOptions.map((status) => ({
    value: status,
    label: status === "all" ? t("skills.filters.allStatuses") : status
  }));

  return (
    <>
      <header className="mb-6">
        <p className="mb-1 text-sm">{t("skills.pageLabel")}</p>
        <div className="flex items-center justify-between gap-4 max-[860px]:items-start">
          <div className="min-w-0">
            <h1 className="text-[28px] font-semibold leading-tight">{t("skills.heading")}</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              {t("skills.description")}
            </p>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled
              title={syncTitle}
              aria-label={t("skills.actions.syncSelectedAria")}
            >
              {syncLabel}
            </Button>
            <Button type="button">{t("skills.actions.addSkill")}</Button>
          </div>
        </div>
      </header>

      <section
        className="grid grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))] items-end gap-3 rounded-xl border border-border bg-card p-4 max-[1180px]:grid-cols-2"
        aria-label={t("skills.filters.ariaLabel")}
      >
        <Field label={t("skills.filters.search")}>
          <Input
            type="search"
            value={page.query}
            placeholder={t("skills.filters.searchPlaceholder")}
            onValueChange={page.setQuery}
          />
        </Field>
        <Field label={t("skills.filters.sort")}>
          <Select value={page.sort} options={sortOptions} onValueChange={page.setSort} />
        </Field>
        <Field label={t("skills.filters.repository")}>
          <Select
            value={page.repositoryFilter}
            options={repositoryOptions}
            onValueChange={page.setRepositoryFilter}
          />
        </Field>
        <Field label={t("skills.filters.status")}>
          <Select
            value={page.statusFilter}
            options={statusOptions}
            onValueChange={page.setStatusFilter}
          />
        </Field>
      </section>

      <section className="mt-5 overflow-hidden rounded-xl border border-border bg-card">
        <div
          className={cn(
            "grid items-center gap-3 border-b border-border bg-muted/40 px-4 py-3 text-xs font-semibold text-muted-foreground max-[820px]:hidden",
            tableGridColumnsClassName
          )}
        >
          <span className="grid place-items-center">
            <Checkbox
              checked={page.visibleAllChecked}
              indeterminate={page.visibleSomeChecked && !page.visibleAllChecked}
              aria-label={t("skills.table.selectAll")}
              disabled={!hasVisibleSkills}
              onCheckedChange={page.selectAllVisible}
            />
          </span>
          <span>{t("skills.table.skill")}</span>
          <span>{t("skills.table.repository")}</span>
          <span>{t("skills.table.version")}</span>
          <span>{t("skills.table.status")}</span>
          <span>{t("skills.table.targets")}</span>
          <span>{t("skills.table.enabled")}</span>
          <span>{t("skills.table.actions")}</span>
        </div>

        {hasVisibleSkills ? (
          visibleSkills.map((skill) => (
            <div
              key={skill.id}
              className={cn(
                "grid items-center gap-3 border-b border-border px-4 py-3 last:border-b-0 max-[820px]:grid-cols-[34px_minmax(0,1fr)_auto]",
                tableGridColumnsClassName,
                skill.id === selectedSkill?.id &&
                  "bg-primary/5 shadow-[inset_3px_0_0_theme(colors.primary)]"
              )}
            >
              <span className="grid place-items-center">
                <Checkbox
                  checked={page.checkedIds.has(skill.id)}
                  aria-label={t("skills.table.selectSkill", { name: skill.name })}
                  onCheckedChange={(checked) => page.toggleSkillChecked(skill.id, checked)}
                />
              </span>
              <Button
                type="button"
                variant="ghost"
                className="grid h-auto min-w-0 justify-start gap-1 px-0 py-0 text-left font-normal hover:bg-transparent focus-visible:ring-3 focus-visible:ring-ring/50"
                aria-label={skill.name}
                aria-selected={skill.id === selectedSkill?.id}
                onClick={() => page.setSelectedSkillId(skill.id)}
              >
                <strong className="block truncate text-sm">{skill.name}</strong>
                <span className="block truncate font-mono text-xs text-muted-foreground">
                  {skill.skillId}
                </span>
              </Button>
              <span className="truncate text-sm">{skill.repository}</span>
              <span className="truncate font-mono text-sm">{skill.version}</span>
              <span>
                <span
                  className={cn(
                    "inline-flex min-h-6 items-center rounded-full border px-2 text-xs",
                    statusClassName[skill.status]
                  )}
                >
                  {skill.status}
                </span>
              </span>
              <span className="font-mono text-sm">{skill.targets.length}</span>
              <Toggle enabled={skill.enabled} />
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled
                title={syncTitle}
                aria-label={t("skills.actions.syncSkillUnavailable", { name: skill.name })}
              >
                {t("skills.actions.sync")}
              </Button>
            </div>
          ))
        ) : (
          <div className="px-4 py-9 text-center text-sm text-muted-foreground">
            {t("skills.empty")}
          </div>
        )}
      </section>
    </>
  );
};
