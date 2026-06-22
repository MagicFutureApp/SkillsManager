import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { RepositoryStatusPill } from "./repository-status-pill";
import type { RepositoryViewModel } from "./repository-data";
import type { RepositorySyncState } from "../hooks/use-repositories-page-state";
import { AlertCircle, CheckCircle2, RefreshCw, SearchX } from "lucide-react";
import React from "react";

type RepositoryListProps = {
  copy: {
    actions: string;
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
  repositorySyncStates: Record<string, RepositorySyncState>;
  repositories: RepositoryViewModel[];
  selectedRepositoryId: string | null;
  visibleAllChecked: boolean;
  visibleSomeChecked: boolean;
  onSelectAllVisible: (checked: boolean) => void;
  onSelectRepository: (repositoryId: string) => void;
  onSyncRepository: (repositoryId: string) => void;
  onToggleChecked: (repositoryId: string, checked: boolean) => void;
  onToggleEnabled: (repositoryId: string) => void;
};

export const RepositoryList = ({
  checkedIds,
  copy,
  repositorySyncStates,
  repositories,
  selectedRepositoryId,
  visibleAllChecked,
  visibleSomeChecked,
  onSelectAllVisible,
  onSelectRepository,
  onSyncRepository,
  onToggleChecked,
  onToggleEnabled
}: RepositoryListProps) => {
  const gridColumnsClassName =
    "grid-cols-[34px_minmax(0,1.9fr)_minmax(0,0.9fr)_minmax(0,0.8fr)_minmax(0,0.65fr)_34px_minmax(52px,0.45fr)]";

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
        <span>{copy.status}</span>
        <span>{copy.skills}</span>
        <span aria-hidden="true" />
        <span>{copy.actions}</span>
      </div>

      {repositories.length === 0 ? (
        <div className="px-4 py-9 text-center text-sm text-muted-foreground">{copy.empty}</div>
      ) : (
        repositories.map((repository) => (
          <div
            key={repository.id}
            className={cn(
              "grid items-center gap-3 border-b border-border px-4 py-3 last:border-b-0 max-[820px]:grid-cols-[34px_minmax(0,1fr)_34px_auto]",
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
            <span className="max-[820px]:hidden">
              <RepositoryStatusPill status={repository.status} />
            </span>
            <span className="font-mono text-sm max-[820px]:hidden">{repository.skillUnits}</span>
            <RepositorySyncIndicator
              repository={repository}
              state={repositorySyncStates[repository.id]}
              onSyncRepository={onSyncRepository}
            />
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

const RepositorySyncIndicator = ({
  repository,
  state,
  onSyncRepository
}: {
  repository: RepositoryViewModel;
  state?: RepositorySyncState;
  onSyncRepository: (repositoryId: string) => void;
}) => {
  const indicatorState = resolveSyncIndicatorState(repository, state);
  const { message, status } = indicatorState;
  const ariaLabel = `${repository.name} ${message}`;
  const Icon = syncIconByStatus[status];
  const isSyncing = status === "syncing";

  return (
    <Tooltip>
      <TooltipTrigger
        aria-label={ariaLabel}
        aria-disabled={isSyncing}
        type="button"
        className={cn(
          "grid size-7 place-items-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50",
          syncClassNameByStatus[status]
        )}
        onClick={(event) => {
          event.stopPropagation();
          if (isSyncing) {
            return;
          }
          void onSyncRepository(repository.id);
        }}
      >
        <Icon aria-hidden="true" className={cn("size-4", isSyncing && "animate-spin")} />
      </TooltipTrigger>
      <TooltipContent side="top" align="center" className="max-w-sm leading-5">
        {message}
      </TooltipContent>
    </Tooltip>
  );
};

const resolveSyncIndicatorState = (
  repository: RepositoryViewModel,
  state?: RepositorySyncState
): { message: string; status: RepositorySyncState["status"] | "idle" } => {
  if (state) {
    return state;
  }

  if (!repository.lastSync) {
    return {
      message: "尚未开始同步。",
      status: "idle"
    };
  }

  if (repository.lastSync.status === "running") {
    return {
      message: "最后一次同步仍在运行。",
      status: "syncing"
    };
  }

  if (repository.lastSync.status === "interrupted") {
    return {
      message: repository.lastSync.errorMessage
        ? `最后一次同步被中断。${repository.lastSync.errorMessage}`
        : "最后一次同步被中断。",
      status: "failed"
    };
  }

  if (repository.lastSync.status === "failed") {
    return {
      message: repository.lastSync.errorMessage
        ? `最后一次同步失败。${repository.lastSync.errorMessage}`
        : "最后一次同步失败。",
      status: "failed"
    };
  }

  return {
    message: buildLastSuccessfulSyncMessage(repository),
    status: repository.skillUnits > 0 ? "success" : "empty"
  };
};

const buildLastSuccessfulSyncMessage = (repository: RepositoryViewModel): string => {
  const skillSummary =
    repository.skillUnits > 0
      ? `最后一次同步成功。已入库 ${repository.skillUnits} 个 Skills。`
      : "最后一次同步成功。未发现可入库的 Skills。";

  return `${skillSummary}新增 ${repository.scan.added}，更新 ${repository.scan.changed}，移除 ${repository.scan.removed}，警告 ${repository.scan.warnings}。commit ${repository.lastCommit}`;
};

const syncIconByStatus = {
  empty: SearchX,
  failed: AlertCircle,
  idle: RefreshCw,
  success: CheckCircle2,
  syncing: RefreshCw
};

const syncClassNameByStatus = {
  empty: "text-amber-600 dark:text-amber-400",
  failed: "text-destructive",
  idle: "text-muted-foreground/70",
  success: "text-emerald-600 dark:text-emerald-400",
  syncing: "text-primary"
};
