import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DataTablePaginationFooter } from "@/components/data-table-pagination-footer";
import {
  DataTableCell,
  DataTableEmptyRow,
  DataTableFixed,
  DataTableFixedBody,
  DataTableFixedHeader,
  DataTableHead,
  DataTableRow
} from "@/components/data-table";
import { Input } from "@/components/ui/input";
import { Select, type SelectOption } from "@/components/ui/select";
import { shouldIgnoreRowSelection } from "@/lib/row-selection";
import React from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";

import {
  getDistributionTitleKey,
  getSkillDistributionState,
  type Skill,
  type SkillRepositoryFilter,
  type SkillSort
} from "./skills-page-data";
import { Field } from "./skills-page-controls";
import { useSkillsPageContext } from "./skills-page-context";

const skillTableColumns = {
  actions: "w-18",
  repository: "w-[24%]",
  select: "w-10",
  targets: "w-14"
};

export const SkillsPageMain = () => {
  const { t } = useTranslation();
  const page = useSkillsPageContext();
  const { visibleSkills } = page;
  const hasVisibleSkills = visibleSkills.length > 0;
  const selectedDistributionReady = page.checkedDistributionState === "ready";
  const selectedSyncTitle = t(getDistributionTitleKey(page.checkedDistributionState, "selected"));
  const syncLabel = t("skills.actions.sync");
  const distributionStatus = page.distributionExecuteResult
    ? t("skills.actions.distributionCompletedStatus", page.distributionExecuteResult.summary)
    : page.distributionNoticeKey
      ? t(page.distributionNoticeKey)
      : null;
  const sortOptions: SelectOption<SkillSort>[] = [
    { value: "name", label: t("skills.filters.sortName") },
    { value: "repository", label: t("skills.filters.sortRepository") }
  ];
  const repositoryOptions: SelectOption<SkillRepositoryFilter>[] = page.repositoryOptions.map(
    (repository) => ({
      value: repository,
      label: repository === "all" ? t("skills.filters.allRepositories") : repository
    })
  );

  return (
    <div className="flex h-full min-h-0 flex-col">
      <SkillsDistributionToast
        message={page.distributionNoticeVisible ? distributionStatus : null}
      />
      <header className="mb-6">
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
              disabled={!selectedDistributionReady}
              title={selectedSyncTitle}
              aria-label={t("skills.actions.syncSelectedAria")}
              onClick={page.startSelectedSkillsDistribution}
            >
              {syncLabel}
            </Button>
          </div>
        </div>
      </header>

      <section
        className="grid grid-cols-[minmax(0,2fr)_repeat(2,minmax(0,1fr))] items-end gap-3 rounded-xl border border-border bg-card p-4 max-[1180px]:grid-cols-2"
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
      </section>

      <DataTableFixed containerClassName="mt-5">
        <DataTableFixedHeader>
          <DataTableRow>
            <DataTableHead className={skillTableColumns.select}>
              <span className="grid place-items-center">
                <Checkbox
                  checked={page.visibleAllChecked}
                  indeterminate={page.visibleSomeChecked && !page.visibleAllChecked}
                  aria-label={t("skills.table.selectAll")}
                  disabled={!hasVisibleSkills}
                  onCheckedChange={page.selectAllVisible}
                />
              </span>
            </DataTableHead>
            <DataTableHead>{t("skills.table.skill")}</DataTableHead>
            <DataTableHead className={skillTableColumns.repository}>
              {t("skills.table.repository")}
            </DataTableHead>
            <DataTableHead className={skillTableColumns.targets}>
              {t("skills.table.targets")}
            </DataTableHead>
            <DataTableHead className={skillTableColumns.actions}>
              {t("skills.table.actions")}
            </DataTableHead>
          </DataTableRow>
        </DataTableFixedHeader>

        <DataTableFixedBody>
          {hasVisibleSkills ? (
            visibleSkills.map((skill) => <SkillTableRow key={skill.id} skill={skill} />)
          ) : (
            <DataTableEmptyRow colSpan={5}>{t("skills.empty")}</DataTableEmptyRow>
          )}
        </DataTableFixedBody>

        <DataTablePaginationFooter
          colSpan={5}
          labelKeyPrefix="skills.pagination"
          onPageChange={page.setSkillsPage}
          pagination={page.pagination}
        />
      </DataTableFixed>
    </div>
  );
};

const SkillsDistributionToast = ({ message }: { message: string | null }) => {
  if (!message || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div
      role="status"
      data-testid="skills-distribution-toast"
      className="pointer-events-none fixed right-6 top-16 z-[60] max-w-sm rounded-lg border border-border bg-card px-4 py-3 text-sm leading-5 text-card-foreground shadow-lg"
    >
      {message}
    </div>,
    document.body
  );
};

const SkillTableRow = ({ skill }: { skill: Skill }) => {
  const { t } = useTranslation();
  const page = useSkillsPageContext();
  const { selectedSkill } = page;
  const distributionState = getSkillDistributionState(skill);
  const distributionReady = distributionState === "ready";
  const distributionTitle = t(getDistributionTitleKey(distributionState, "single"));

  return (
    <DataTableRow
      className="cursor-pointer"
      selected={skill.id === selectedSkill?.id}
      onClick={(event) => {
        if (shouldIgnoreRowSelection(event)) {
          return;
        }

        page.setSelectedSkillId(skill.id);
      }}
    >
      <DataTableCell className={skillTableColumns.select}>
        <span className="grid place-items-center">
          <Checkbox
            checked={page.checkedIds.has(skill.id)}
            aria-label={t("skills.table.selectSkill", { name: skill.name })}
            onCheckedChange={(checked) => page.toggleSkillChecked(skill.id, checked)}
          />
        </span>
      </DataTableCell>
      <DataTableCell className="min-w-0">
        <Button
          type="button"
          variant="ghost"
          className="grid h-auto min-w-0 justify-start gap-1 px-0 py-0 text-left font-normal hover:bg-transparent focus-visible:ring-3 focus-visible:ring-ring/50"
          aria-label={skill.name}
          aria-selected={skill.id === selectedSkill?.id}
          onClick={() => page.setSelectedSkillId(skill.id)}
        >
          <strong className="block truncate text-sm">{skill.name}</strong>
        </Button>
      </DataTableCell>
      <DataTableCell
        className={`${skillTableColumns.repository} truncate text-sm max-[820px]:hidden`}
      >
        {skill.repository}
      </DataTableCell>
      <DataTableCell
        className={`${skillTableColumns.targets} font-mono text-sm max-[820px]:hidden`}
      >
        {skill.targets.length}
      </DataTableCell>
      <DataTableCell className={skillTableColumns.actions}>
        <Button
          type="button"
          size="sm"
          disabled={!distributionReady}
          title={distributionTitle}
          aria-label={t("skills.actions.syncSkillAria", { name: skill.name })}
          onClick={(event) => {
            event.stopPropagation();
            page.startSkillDistribution(skill.id);
          }}
        >
          {t("skills.actions.sync")}
        </Button>
      </DataTableCell>
    </DataTableRow>
  );
};
