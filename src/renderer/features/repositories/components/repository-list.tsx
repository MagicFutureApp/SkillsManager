import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
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
          <Checkbox
            checked={visibleAllChecked}
            indeterminate={visibleSomeChecked && !visibleAllChecked}
            disabled={!repositories.length}
            aria-label={copy.selectAll}
            onCheckedChange={onSelectAllVisible}
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
              <Checkbox
                checked={checkedIds.has(repository.id)}
                aria-label={copy.selectRepository(repository.name)}
                onCheckedChange={(checked) => onToggleChecked(repository.id, checked)}
              />
            </span>
            <Button
              type="button"
              variant="ghost"
              className="grid h-auto min-w-0 justify-start gap-1 px-0 py-0 text-left font-normal hover:bg-transparent focus-visible:ring-3 focus-visible:ring-ring/50"
              aria-label={repository.name}
              aria-selected={repository.id === selectedRepositoryId}
              onClick={() => onSelectRepository(repository.id)}
            >
              <span className="truncate text-sm font-semibold">{repository.name}</span>
              <span className="truncate font-mono text-xs text-muted-foreground">
                {repository.remoteUrl}
              </span>
            </Button>
            <span className="text-sm max-[820px]:hidden">{repository.provider}</span>
            <span className="font-mono text-sm max-[820px]:hidden">{repository.branch}</span>
            <span className="max-[820px]:hidden">
              <RepositoryStatusPill status={repository.status} />
            </span>
            <span className="font-mono text-sm max-[820px]:hidden">{repository.skillUnits}</span>
            <Switch
              checked={repository.enabled}
              aria-label={copy.toggleEnabled(repository.name)}
              onCheckedChange={() => onToggleEnabled(repository.id)}
            />
          </div>
        ))
      )}
    </section>
  );
};
