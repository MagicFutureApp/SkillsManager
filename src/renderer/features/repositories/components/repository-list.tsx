import { cn } from "@/lib/utils";
import { RepositoryStatusPill } from "./repository-status-pill";
import type { RepositoryViewModel } from "./repository-data";
import React from "react";

type RepositoryListProps = {
  copy: {
    actions: string;
    branch: string;
    empty: string;
    provider: string;
    repository: string;
    selectAll: string;
    selectRepository: (name: string) => string;
    skills: string;
    status: string;
    toggleEnabled: (name: string) => string;
  };
  checkedIds: Set<string>;
  repositories: RepositoryViewModel[];
  selectedRepositoryId: string | null;
  visibleAllChecked: boolean;
  visibleSomeChecked: boolean;
  onSelectAllVisible: (checked: boolean) => void;
  onSelectRepository: (repositoryId: string) => void;
  onToggleChecked: (repositoryId: string, checked: boolean) => void;
  onToggleEnabled: (repositoryId: string) => void;
};

export const RepositoryList = ({
  checkedIds,
  copy,
  repositories,
  selectedRepositoryId,
  visibleAllChecked,
  visibleSomeChecked,
  onSelectAllVisible,
  onSelectRepository,
  onToggleChecked,
  onToggleEnabled
}: RepositoryListProps) => {
  const selectAllRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = visibleSomeChecked && !visibleAllChecked;
    }
  }, [visibleAllChecked, visibleSomeChecked]);

  const gridColumnsClassName =
    "grid-cols-[34px_minmax(0,1.7fr)_minmax(0,0.85fr)_minmax(0,0.8fr)_minmax(0,0.8fr)_minmax(0,0.65fr)_minmax(52px,0.45fr)]";

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card">
      <div
        className={cn(
          "grid items-center gap-3 border-b border-border bg-muted/40 px-4 py-3 text-xs font-semibold text-muted-foreground max-[820px]:hidden",
          gridColumnsClassName
        )}
      >
        <span className="grid place-items-center">
          <input
            ref={selectAllRef}
            className="size-[18px]"
            type="checkbox"
            checked={visibleAllChecked}
            disabled={!repositories.length}
            aria-label={copy.selectAll}
            onChange={(event) => onSelectAllVisible(event.target.checked)}
          />
        </span>
        <span>{copy.repository}</span>
        <span>{copy.provider}</span>
        <span>{copy.branch}</span>
        <span>{copy.status}</span>
        <span>{copy.skills}</span>
        <span>{copy.actions}</span>
      </div>

      {repositories.length === 0 ? (
        <div className="px-4 py-9 text-center text-sm text-muted-foreground">{copy.empty}</div>
      ) : (
        repositories.map((repository) => (
          <div
            key={repository.id}
            className={cn(
              "grid items-center gap-3 border-b border-border px-4 py-3 last:border-b-0 max-[820px]:grid-cols-[34px_minmax(0,1fr)_auto]",
              gridColumnsClassName,
              repository.id === selectedRepositoryId &&
                "bg-primary/5 shadow-[inset_3px_0_0_theme(colors.primary)]"
            )}
          >
            <span className="grid place-items-center">
              <input
                className="size-[18px]"
                type="checkbox"
                checked={checkedIds.has(repository.id)}
                aria-label={copy.selectRepository(repository.name)}
                onChange={(event) => onToggleChecked(repository.id, event.target.checked)}
              />
            </span>
            <button
              type="button"
              className="grid min-w-0 gap-1 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              aria-label={repository.name}
              aria-selected={repository.id === selectedRepositoryId}
              onClick={() => onSelectRepository(repository.id)}
            >
              <span className="truncate text-sm font-semibold">{repository.name}</span>
              <span className="truncate font-mono text-xs text-muted-foreground">
                {repository.remoteUrl}
              </span>
            </button>
            <span className="text-sm max-[820px]:hidden">{repository.provider}</span>
            <span className="font-mono text-sm max-[820px]:hidden">{repository.branch}</span>
            <span className="max-[820px]:hidden">
              <RepositoryStatusPill status={repository.status} />
            </span>
            <span className="font-mono text-sm max-[820px]:hidden">{repository.skillUnits}</span>
            <button
              type="button"
              className={cn(
                "inline-flex h-[26px] w-[46px] items-center rounded-full border p-0.5",
                repository.enabled
                  ? "justify-end border-primary bg-primary"
                  : "justify-start border-border bg-muted"
              )}
              role="switch"
              aria-checked={repository.enabled}
              aria-label={copy.toggleEnabled(repository.name)}
              onClick={() => onToggleEnabled(repository.id)}
            >
              <span
                className={cn(
                  "size-5 rounded-full border bg-background",
                  repository.enabled ? "border-primary-foreground" : "border-border"
                )}
              />
            </button>
          </div>
        ))
      )}
    </section>
  );
};
