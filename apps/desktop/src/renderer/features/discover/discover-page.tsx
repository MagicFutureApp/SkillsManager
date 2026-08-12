import React from "react";
import type { CatalogSkill } from "@/global";
import { DiscoverPageMain } from "./components/discover-page-main";
import { SkillDetailDialog } from "./components/skill-detail-dialog";
import { useDiscoverPageState } from "./hooks/use-discover-page-state";

export const DiscoverPage = () => {
  const state = useDiscoverPageState();
  // Purely local UI state: kept out of useDiscoverPageState, which only owns the
  // mutually exclusive browse/search data states and their race guards.
  const [detailSkill, setDetailSkill] = React.useState<CatalogSkill | null>(null);

  // External links go through the main-process whitelist; an untrusted `skill.url`
  // may be rejected, so the rejection is swallowed to avoid an unhandled rejection.
  const openExternal = (url: string) => {
    void window.skillsManager?.openExternalUrl?.(url).catch(() => {
      /* 白名单拒绝或系统失败：静默忽略，不打断浏览 */
    });
  };

  return (
    // Mirrors PageLayout's <main>, minus the sider: Discover is a single column.
    <main className="h-full min-h-0 min-w-0 overflow-y-auto bg-background p-7">
      <DiscoverPageMain
        mode={state.mode}
        skills={state.skills}
        status={state.status}
        errorCode={state.errorCode}
        retryAfterSeconds={state.retryAfterSeconds}
        searchInput={state.searchInput}
        onSearchInputChange={state.setSearchInput}
        onSearchSubmit={state.submitSearch}
        onSearchClear={state.clearSearch}
        searchResultQuery={state.searchResultQuery}
        searchType={state.searchType}
        searchCount={state.searchCount}
        searchTruncated={state.searchTruncated}
        formattedTotal={state.formattedTotal}
        isStale={state.isStale}
        page={state.page}
        pageCount={state.pageCount}
        onPageChange={state.setPage}
        onRetry={state.refetch}
        onSelectSkill={setDetailSkill}
      />
      <SkillDetailDialog
        skill={detailSkill}
        onClose={() => setDetailSkill(null)}
        onOpenExternal={openExternal}
      />
    </main>
  );
};
