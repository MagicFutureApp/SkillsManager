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
import { shouldIgnoreRowSelection } from "@/lib/row-selection";
import { Trash2 } from "lucide-react";
import React from "react";
import { useTranslation } from "react-i18next";

import { TargetScopeBadge } from "./target-badges";
import { useTargetsPageContext } from "./targets-page-context";

export const TargetList = () => {
  const { t } = useTranslation();
  const page = useTargetsPageContext();

  return (
    <DataTableFixed containerClassName="mt-5">
      <DataTableFixedHeader>
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
      </DataTableFixedHeader>

      <DataTableFixedBody>
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
      </DataTableFixedBody>

      <DataTablePaginationFooter
        colSpan={6}
        labelKeyPrefix="targets.pagination"
        onPageChange={page.setTargetsPage}
        pagination={page.pagination}
      />
    </DataTableFixed>
  );
};
