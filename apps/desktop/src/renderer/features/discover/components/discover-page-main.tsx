import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pagination, PaginationContent, PaginationItem, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Search } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { CatalogErrorCode, CatalogSearchType, CatalogSkill } from "@/global";
import { SkillCard } from "./skill-card";
import type { DiscoverMode, DiscoverStatus } from "../hooks/use-discover-page-state";

type DiscoverPageMainProps = {
  mode: DiscoverMode;
  skills: CatalogSkill[];
  status: DiscoverStatus;
  errorCode: CatalogErrorCode | null;
  retryAfterSeconds: number | null;
  searchInput: string;
  onSearchInputChange: (query: string) => void;
  onSearchSubmit: () => void;
  onSearchClear: () => void;
  searchResultQuery: string;
  searchType: CatalogSearchType;
  searchCount: number;
  searchTruncated: boolean;
  formattedTotal: string;
  isStale: boolean;
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  onRetry: () => void;
  onSelectSkill: (skill: CatalogSkill) => void;
};

/** Map a catalog failure code to the i18n key shown in the error block. */
const errorMessageKey = (code: CatalogErrorCode | null): string => {
  switch (code) {
    case "config":
      return "discover.errors.config";
    case "warming":
      return "discover.errors.warming";
    case "invalid-query":
      return "discover.errors.invalidQuery";
    case "rate-limited":
      return "discover.errors.rateLimited";
    case "unavailable":
      return "discover.errors.searchUnavailable";
    default:
      return "discover.error";
  }
};

export const DiscoverPageMain = ({ mode, skills, status, errorCode, retryAfterSeconds, searchInput, onSearchInputChange, onSearchSubmit, onSearchClear, searchResultQuery, searchType, searchCount, searchTruncated, formattedTotal, isStale, page, pageCount, onPageChange, onRetry, onSelectSkill }: DiscoverPageMainProps) => {
  const { t } = useTranslation();

  const isSearchMode = mode === "search";
  const canGoPrev = page > 0;
  const canGoNext = pageCount > 0 && page < pageCount - 1;

  // `unavailable` in browse mode is a generic load failure, but in search mode it
  // specifically means the search upstream is down — the copy differs.
  const resolvedErrorKey = errorCode === "unavailable" && !isSearchMode ? "discover.error" : errorMessageKey(errorCode);

  return (
    <>
      <header className="mb-6">
        <h1 className="text-[28px] font-semibold leading-tight">{t("discover.heading")}</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{t("discover.description")}</p>
      </header>

      {/* Filter card: same shape as the repositories/providers filter bars */}
      <section className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3 rounded-xl border border-border bg-card p-4" aria-label={t("discover.filters.ariaLabel")}>
        <div className="relative min-w-0">
          <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
            <Search className="size-4" aria-hidden="true" />
          </span>
          <Input
            type="search"
            value={searchInput}
            onValueChange={onSearchInputChange}
            onKeyDown={(event: React.KeyboardEvent<HTMLInputElement>) => {
              if (event.key === "Enter") {
                // Enter skips the debounce window and searches immediately.
                event.preventDefault();
                onSearchSubmit();
              }
            }}
            placeholder={t("discover.searchPlaceholder", { total: formattedTotal })}
            className="pl-9"
            aria-label={t("discover.searchAriaLabel")}
          />
        </div>
        {isSearchMode ? (
          <Button type="button" variant="outline" onClick={onSearchClear}>
            {t("discover.searchResults.clear")}
          </Button>
        ) : null}
      </section>

      {/* Stale notice: browse-only, search has no generation to fall back to */}
      {isStale ? <p className="mt-3 text-xs text-muted-foreground">{t("discover.staleNotice")}</p> : null}

      {/* Search summary: what was matched, how, and whether it was cut off */}
      {isSearchMode && status === "success" ? (
        <div className="mt-3 grid gap-1">
          <p className="text-sm text-muted-foreground">
            {t("discover.searchResults.summary", {
              query: searchResultQuery,
              count: searchCount
            })}
            <span className="ml-2 text-xs">{t(searchType === "fuzzy" ? "discover.searchType.fuzzy" : "discover.searchType.semantic")}</span>
          </p>
          {searchTruncated ? <p className="text-xs text-amber-600 dark:text-amber-400">{t("discover.searchResults.truncated", { count: searchCount })}</p> : null}
        </div>
      ) : null}

      {/* Content area */}
      {status === "loading" && skills.length === 0 ? (
        <div className="flex items-center justify-center py-20">
          <p className="text-sm text-muted-foreground">{t(isSearchMode ? "discover.searchResults.searching" : "discover.loading")}</p>
        </div>
      ) : status === "error" ? (
        <div className="flex flex-col items-center justify-center gap-3 py-20">
          <p className="max-w-md text-center text-sm text-destructive">{t(resolvedErrorKey, { seconds: retryAfterSeconds ?? 0 })}</p>
          <Button type="button" variant="outline" onClick={onRetry}>
            {t("discover.retry")}
          </Button>
        </div>
      ) : skills.length === 0 ? (
        <div className="flex items-center justify-center py-20">
          <p className="text-sm text-muted-foreground">{isSearchMode ? t("discover.searchResults.empty", { query: searchResultQuery }) : t("discover.empty")}</p>
        </div>
      ) : (
        <>
          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {skills.map((skill) => (
              <SkillCard key={skill.id} skill={skill} onOpenDetail={onSelectSkill} />
            ))}
          </div>

          {/* Pagination is browse-only: search results are relevance ranked and
              deliberately capped, so there are no further pages to walk. */}
          {!isSearchMode && pageCount > 1 ? (
            <Pagination className="mt-4">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious onClick={() => canGoPrev && onPageChange(page - 1)} aria-disabled={!canGoPrev} className={!canGoPrev ? "pointer-events-none opacity-50" : undefined} aria-label={t("skills.pagination.previous")} />
                </PaginationItem>
                <PaginationItem>
                  <span className="px-3 py-1.5 text-sm text-muted-foreground">{t("discover.pagination.pageInfo", { current: page + 1, total: pageCount })}</span>
                </PaginationItem>
                <PaginationItem>
                  <PaginationNext onClick={() => canGoNext && onPageChange(page + 1)} aria-disabled={!canGoNext} className={!canGoNext ? "pointer-events-none opacity-50" : undefined} aria-label={t("skills.pagination.next")} />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          ) : null}
        </>
      )}
    </>
  );
};
