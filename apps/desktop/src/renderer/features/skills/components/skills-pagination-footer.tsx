import { DataTablePaginationFooter } from "@/components/data-table-pagination-footer";
import type { PaginationState } from "@/lib/pagination";
import React from "react";

type SkillsPaginationFooterProps = {
  colSpan: number;
  onPageChange: (pageNumber: number) => void;
  pagination: PaginationState;
};

export const SkillsPaginationFooter = ({
  colSpan,
  onPageChange,
  pagination
}: SkillsPaginationFooterProps) => {
  return (
    <DataTablePaginationFooter
      colSpan={colSpan}
      labelKeyPrefix="skills.pagination"
      onPageChange={onPageChange}
      pagination={pagination}
    />
  );
};
