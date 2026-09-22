import { Button } from "@/components/ui/button";
import {
  DataTableCell,
  DataTableEmptyRow,
  DataTableFixed,
  DataTableFixedBody,
  DataTableFixedHeader,
  DataTableHead,
  DataTableRow
} from "@/components/data-table";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { LoaderCircle } from "lucide-react";
import { Select, type SelectOption } from "@/components/ui/select";
import { DataTablePaginationFooter } from "@/components/data-table-pagination-footer";
import { useTranslation } from "react-i18next";
import React from "react";

import type { Best100SearchInput, Best100SkillRecord } from "@/global";
import { useRecommendedPageContext } from "./recommended-page-context";

type RecommendedSort = NonNullable<Best100SearchInput["sort"]>;

const recommendedTableColumns = {
  actions: "w-24 text-center",
  platform: "w-[16%] text-left",
  rank: "w-14 text-center",
  skill: "text-left",
  vendor: "w-[20%] text-left",
  wis: "w-20 text-right"
};

export const RecommendedPageMain = () => {
  const { t } = useTranslation();
  const page = useRecommendedPageContext();
  const { items } = page;
  const hasItems = items.length > 0;
  const sortOptions: SelectOption<RecommendedSort>[] = [
    { value: "rank", label: t("recommended.filters.sortRank") },
    { value: "name", label: t("recommended.filters.sortName") },
    { value: "wis", label: t("recommended.filters.sortWis") }
  ];

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="mb-6">
        <div className="flex items-center justify-between gap-4 max-[860px]:items-start">
          <div className="min-w-0">
            <h1 className="text-[28px] font-semibold leading-tight">{t("recommended.heading")}</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              {t("recommended.description")}
            </p>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              disabled={page.isSyncing}
              title={t("recommended.actions.syncAria")}
              aria-label={t("recommended.actions.syncAria")}
              onClick={page.syncNow}
            >
              {page.isSyncing ? (
                <>
                  <LoaderCircle aria-hidden="true" className="animate-spin" />
                  {t("recommended.actions.syncing")}
                </>
              ) : (
                t("recommended.actions.sync")
              )}
            </Button>
          </div>
        </div>
      </header>

      <section
        className="grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)] items-end gap-3 rounded-xl border border-border bg-card p-4 max-[1180px]:grid-cols-1"
        aria-label={t("recommended.filters.ariaLabel")}
      >
        <Field>
          <FieldLabel>{t("recommended.filters.search")}</FieldLabel>
          <Input
            type="search"
            value={page.query}
            placeholder={t("recommended.filters.searchPlaceholder")}
            onValueChange={page.setQuery}
          />
        </Field>
        <Field>
          <FieldLabel>{t("recommended.filters.sort")}</FieldLabel>
          <Select value={page.sort} options={sortOptions} onValueChange={page.setSort} />
        </Field>
      </section>

      <DataTableFixed containerClassName="mt-5">
        <DataTableFixedHeader>
          <DataTableRow>
            <DataTableHead className={recommendedTableColumns.rank}>
              {t("recommended.table.rank")}
            </DataTableHead>
            <DataTableHead className={recommendedTableColumns.skill}>
              {t("recommended.table.skill")}
            </DataTableHead>
            <DataTableHead className={recommendedTableColumns.vendor}>
              {t("recommended.table.vendor")}
            </DataTableHead>
            <DataTableHead className={recommendedTableColumns.platform}>
              {t("recommended.table.platform")}
            </DataTableHead>
            <DataTableHead className={recommendedTableColumns.wis}>
              {t("recommended.table.wis")}
            </DataTableHead>
            <DataTableHead className={recommendedTableColumns.actions}>
              {t("recommended.table.actions")}
            </DataTableHead>
          </DataTableRow>
        </DataTableFixedHeader>

        <DataTableFixedBody>
          {page.isLoading ? (
            <DataTableEmptyRow colSpan={6}>
              <span className="inline-flex items-center gap-2">
                <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
                {t("recommended.actions.syncing")}
              </span>
            </DataTableEmptyRow>
          ) : hasItems ? (
            items.map((skill) => <RecommendedTableRow key={skill.skillKey} skill={skill} />)
          ) : (
            <DataTableEmptyRow colSpan={6}>{t("recommended.empty")}</DataTableEmptyRow>
          )}
        </DataTableFixedBody>

        <DataTablePaginationFooter
          colSpan={6}
          labelKeyPrefix="recommended.pagination"
          onPageChange={page.setSkillsPage}
          pagination={page.pagination}
        />
      </DataTableFixed>
    </div>
  );
};

const RecommendedTableRow = ({ skill }: { skill: Best100SkillRecord }) => {
  const { t } = useTranslation();
  const page = useRecommendedPageContext();
  const { selectedSkill } = page;

  return (
    <DataTableRow
      selected={skill.skillKey === selectedSkill?.skillKey}
      onClick={() => page.selectSkill(skill)}
    >
      <DataTableCell className={`${recommendedTableColumns.rank} font-mono text-sm`}>
        {skill.rank || "--"}
      </DataTableCell>
      <DataTableCell className={`${recommendedTableColumns.skill} min-w-0`}>
        <Button
          type="button"
          variant="ghost"
          className="grid h-auto min-w-0 justify-start gap-1 px-0 py-0 text-left font-normal hover:bg-transparent focus-visible:ring-3 focus-visible:ring-ring/50"
          aria-label={skill.skill}
          aria-selected={skill.skillKey === selectedSkill?.skillKey}
          onClick={() => page.selectSkill(skill)}
        >
          <strong className="block truncate text-sm">{skill.skill || "--"}</strong>
        </Button>
      </DataTableCell>
      <DataTableCell className={`${recommendedTableColumns.vendor} truncate text-sm`}>
        {skill.vendor || "--"}
      </DataTableCell>
      <DataTableCell className={`${recommendedTableColumns.platform} truncate text-sm`}>
        {skill.platform || "--"}
      </DataTableCell>
      <DataTableCell className={`${recommendedTableColumns.wis} font-mono text-sm`}>
        {skill.wis ?? "--"}
      </DataTableCell>
      <DataTableCell className={recommendedTableColumns.actions}>
        <Button
          type="button"
          size="sm"
          title={t("recommended.actions.installAria", { name: skill.skill })}
          aria-label={t("recommended.actions.installAria", { name: skill.skill })}
          disabled={!skill.repoUrl && !skill.url}
          onClick={(event) => {
            event.stopPropagation();
            void page.installSkill(skill);
          }}
        >
          {t("recommended.actions.install")}
        </Button>
      </DataTableCell>
    </DataTableRow>
  );
};
