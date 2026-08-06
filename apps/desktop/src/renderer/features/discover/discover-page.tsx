import React from "react";
import { DiscoverPageMain } from "./components/discover-page-main";
import { useDiscoverPageState } from "./hooks/use-discover-page-state";

export const DiscoverPage = () => {
  const state = useDiscoverPageState();

  // External links go through the main-process whitelist; an untrusted `skill.url`
  // may be rejected, so the rejection is swallowed to avoid an unhandled rejection.
  const openExternal = (url: string) => {
    void window.skillsManager?.openExternalUrl?.(url).catch(() => {
      /* 白名单拒绝或系统失败：静默忽略，不打断浏览 */
    });
  };

  return (
    <div className="h-full overflow-y-auto bg-background">
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
        onOpenExternal={openExternal}
      />
    </div>
  );
};
