import { DataTableCell, DataTableFixedFooter, DataTableRow } from "@/components/data-table";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious
} from "@/components/ui/pagination";
import { cn } from "@/lib/utils";
import React from "react";
import { useTranslation } from "react-i18next";

import type { SkillsPaginationState } from "../hooks/use-skills-page-state";

type SkillsPaginationFooterProps = {
  colSpan: number;
  onPageChange: (pageNumber: number) => void;
  pagination: SkillsPaginationState;
};

export const SkillsPaginationFooter = ({
  colSpan,
  onPageChange,
  pagination
}: SkillsPaginationFooterProps) => {
  const { t } = useTranslation();
  const paginationPages = getPaginationPageItems(pagination.currentPage, pagination.totalPages);

  if (pagination.totalItems === 0) {
    return null;
  }

  return (
    <DataTableFixedFooter>
      <DataTableRow className="hover:bg-transparent">
        <DataTableCell colSpan={colSpan} className="px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              {t("skills.pagination.range", {
                end: pagination.endIndex,
                start: pagination.startIndex,
                total: pagination.totalItems
              })}
            </p>
            {pagination.totalPages > 1 ? (
              <Pagination
                aria-label={t("skills.pagination.ariaLabel")}
                className="mx-0 w-auto justify-end"
              >
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      text={t("skills.pagination.previous")}
                      aria-label={t("skills.pagination.previous")}
                      aria-disabled={!pagination.hasPreviousPage}
                      tabIndex={pagination.hasPreviousPage ? undefined : -1}
                      className={cn(
                        !pagination.hasPreviousPage && "pointer-events-none opacity-50"
                      )}
                      onClick={(event) => {
                        event.preventDefault();

                        if (pagination.hasPreviousPage) {
                          onPageChange(pagination.currentPage - 1);
                        }
                      }}
                    />
                  </PaginationItem>
                  {paginationPages.map((paginationPage) => (
                    <PaginationItem key={paginationPage}>
                      {typeof paginationPage === "number" ? (
                        <PaginationLink
                          href="#"
                          isActive={paginationPage === pagination.currentPage}
                          aria-label={t("skills.pagination.pageAriaLabel", {
                            page: paginationPage
                          })}
                          onClick={(event) => {
                            event.preventDefault();
                            onPageChange(paginationPage);
                          }}
                        >
                          {paginationPage}
                        </PaginationLink>
                      ) : (
                        <PaginationEllipsis />
                      )}
                    </PaginationItem>
                  ))}
                  <PaginationItem>
                    <PaginationNext
                      href="#"
                      text={t("skills.pagination.next")}
                      aria-label={t("skills.pagination.next")}
                      aria-disabled={!pagination.hasNextPage}
                      tabIndex={pagination.hasNextPage ? undefined : -1}
                      className={cn(!pagination.hasNextPage && "pointer-events-none opacity-50")}
                      onClick={(event) => {
                        event.preventDefault();

                        if (pagination.hasNextPage) {
                          onPageChange(pagination.currentPage + 1);
                        }
                      }}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            ) : null}
          </div>
        </DataTableCell>
      </DataTableRow>
    </DataTableFixedFooter>
  );
};

type PaginationPageItem = number | "ellipsis-left" | "ellipsis-right";

const getPaginationPageItems = (currentPage: number, totalPages: number): PaginationPageItem[] => {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pageSet = new Set([1, totalPages, currentPage - 1, currentPage, currentPage + 1]);
  const pages = Array.from(pageSet)
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((left, right) => left - right);

  return pages.reduce<PaginationPageItem[]>((items, page, index) => {
    const previousPage = pages[index - 1];

    if (!previousPage || page - previousPage === 1) {
      items.push(page);
      return items;
    }

    items.push(
      page - previousPage === 2
        ? previousPage + 1
        : items.includes("ellipsis-left")
          ? "ellipsis-right"
          : "ellipsis-left"
    );
    items.push(page);

    return items;
  }, []);
};
