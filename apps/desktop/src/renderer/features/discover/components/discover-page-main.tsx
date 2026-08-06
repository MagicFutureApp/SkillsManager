import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious
} from "@/components/ui/pagination";
import { ExternalLink, Star } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { CatalogErrorCode, CatalogSearchType, CatalogSkill } from "@/global";
import { formatCompact } from "../discover-utils";
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
  onOpenExternal: (url: string) => void;
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

export const DiscoverPageMain = ({
  mode,
  skills,
  status,
  errorCode,
  retryAfterSeconds,
  searchInput,
  onSearchInputChange,
  onSearchSubmit,
  onSearchClear,
  searchResultQuery,
  searchType,
  searchCount,
  searchTruncated,
  formattedTotal,
  isStale,
  page,
  pageCount,
  onPageChange,
  onRetry,
  onOpenExternal
}: DiscoverPageMainProps) => {
  const { t } = useTranslation();

  const isSearchMode = mode === "search";
  const canGoPrev = page > 0;
  const canGoNext = pageCount > 0 && page < pageCount - 1;

  // `unavailable` in browse mode is a generic load failure, but in search mode it
  // specifically means the search upstream is down — the copy differs.
  const resolvedErrorKey =
    errorCode === "unavailable" && !isSearchMode ? "discover.error" : errorMessageKey(errorCode);

  return (
    <div className="grid h-full min-h-0 content-start gap-6 p-7">
      {/* Page heading */}
      <header className="text-center">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          {t("discover.heading")}
        </h1>
      </header>

      {/* Search bar */}
      <div className="mx-auto flex w-full max-w-2xl items-center gap-3">
        <div className="relative min-w-0 flex-1">
          <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              className="size-4"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
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
            className="pl-9 h-11 text-sm"
            aria-label={t("discover.searchAriaLabel")}
          />
        </div>
        {isSearchMode ? (
          <Button type="button" variant="outline" onClick={onSearchClear}>
            {t("discover.searchResults.clear")}
          </Button>
        ) : null}
      </div>

      {/* Divider */}
      <hr className="border-border" />

      {/* Stale notice: browse-only, search has no generation to fall back to */}
      {isStale ? (
        <p className="text-xs text-muted-foreground text-center">{t("discover.staleNotice")}</p>
      ) : null}

      {/* Search summary: what was matched, how, and whether it was cut off */}
      {isSearchMode && status === "success" ? (
        <div className="grid gap-1 text-center">
          <p className="text-sm text-muted-foreground">
            {t("discover.searchResults.summary", {
              query: searchResultQuery,
              count: searchCount
            })}
            <span className="ml-2 text-xs">
              {t(
                searchType === "fuzzy"
                  ? "discover.searchType.fuzzy"
                  : "discover.searchType.semantic"
              )}
            </span>
          </p>
          {searchTruncated ? (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              {t("discover.searchResults.truncated", { count: searchCount })}
            </p>
          ) : null}
        </div>
      ) : null}

      {/* Content area */}
      {status === "loading" && skills.length === 0 ? (
        <div className="flex items-center justify-center py-20">
          <p className="text-sm text-muted-foreground">
            {t(isSearchMode ? "discover.searchResults.searching" : "discover.loading")}
          </p>
        </div>
      ) : status === "error" ? (
        <div className="flex flex-col items-center justify-center gap-3 py-20">
          <p className="max-w-md text-center text-sm text-destructive">
            {t(resolvedErrorKey, { seconds: retryAfterSeconds ?? 0 })}
          </p>
          <Button type="button" variant="outline" onClick={onRetry}>
            {t("discover.retry")}
          </Button>
        </div>
      ) : skills.length === 0 ? (
        <div className="flex items-center justify-center py-20">
          <p className="text-sm text-muted-foreground">
            {isSearchMode
              ? t("discover.searchResults.empty", { query: searchResultQuery })
              : t("discover.empty")}
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {skills.map((skill) => (
              <SkillCard key={skill.id} skill={skill} onOpenExternal={onOpenExternal} />
            ))}
          </div>

          {/* Pagination is browse-only: search results are relevance ranked and
              deliberately capped, so there are no further pages to walk. */}
          {!isSearchMode && pageCount > 1 ? (
            <Pagination className="mt-2">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => canGoPrev && onPageChange(page - 1)}
                    aria-disabled={!canGoPrev}
                    className={!canGoPrev ? "pointer-events-none opacity-50" : undefined}
                    aria-label={t("skills.pagination.previous")}
                  />
                </PaginationItem>
                <PaginationItem>
                  <span className="px-3 py-1.5 text-sm text-muted-foreground">
                    {t("discover.pagination.pageInfo", { current: page + 1, total: pageCount })}
                  </span>
                </PaginationItem>
                <PaginationItem>
                  <PaginationNext
                    onClick={() => canGoNext && onPageChange(page + 1)}
                    aria-disabled={!canGoNext}
                    className={!canGoNext ? "pointer-events-none opacity-50" : undefined}
                    aria-label={t("skills.pagination.next")}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          ) : null}
        </>
      )}
    </div>
  );
};

/* ── Skill Card ─────────────────────────────────────────────── */

function SkillCard({
  skill,
  onOpenExternal
}: {
  skill: CatalogSkill;
  onOpenExternal: (url: string) => void;
}) {
  const { t } = useTranslation();

  return (
    <article className="group grid gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/30">
      {/* Header: name + installs */}
      <div className="flex items-start justify-between gap-2">
        <h2 className="min-w-0 text-base font-semibold text-foreground">{skill.name}</h2>
        <span
          className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap text-xs font-medium text-amber-600 dark:text-amber-400"
          title={`${skill.installs.toLocaleString()} installs`}
        >
          <Star className="size-3 fill-current" aria-hidden="true" />
          {formatCompact(skill.installs)}
        </span>
      </div>

      {/* Source line */}
      <div className="flex items-center gap-2 overflow-hidden text-sm">
        <span
          className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-bold uppercase text-muted-foreground"
          aria-hidden="true"
        >
          {(skill.source.charAt(0) || "?").toUpperCase()}
        </span>
        <span className="min-w-0 truncate text-muted-foreground" title={skill.source}>
          {skill.source}
        </span>
      </div>

      {/* Description - cache-manager does not return descriptions; show source context */}
      <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">
        {skill.sourceType === "github"
          ? t("discover.card.githubDescription", { source: skill.source })
          : t("discover.card.wellKnownDescription", { source: skill.source })}
      </p>

      {/* Footer: source type + detail link */}
      <div className="flex items-center justify-between pt-1">
        <span className="text-xs text-muted-foreground">
          {skill.sourceType === "github"
            ? t("discover.sourceType.github")
            : t("discover.sourceType.well_known")}
        </span>
        {skill.url ? (
          <button
            type="button"
            onClick={() => onOpenExternal(skill.url)}
            className="inline-flex cursor-pointer items-center gap-1 text-xs font-medium text-primary outline-none transition-colors hover:text-primary/80 focus-visible:text-primary/80"
          >
            <ExternalLink className="size-3" aria-hidden="true" />
            <span>{t("discover.card.openDetail")}</span>
          </button>
        ) : null}
      </div>
    </article>
  );
}
