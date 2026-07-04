import { Button } from "@/components/ui/button";
import { DetailRow } from "@/components/detail-row";
import { cn } from "@/lib/utils";
import { Accordion } from "@base-ui/react/accordion";
import { ListTree } from "lucide-react";
import type { RepositoryViewModel } from "./repository-data";
import React from "react";

type SyncDetailGroupKey = "added" | "changed" | "removed";

type RepositoryDetailProps = {
  copy: {
    branch: string;
    cachePath: string;
    copyCache: string;
    defaultDescription: string;
    defaultTitle: string;
    delete: string;
    edit: string;
    enabled: string;
    enabledNo: string;
    enabledYes: string;
    lastCommit: string;
    lastScan: string;
    openLocation: (location: string) => string;
    patterns: string;
    provider: string;
    remoteUrl: string;
    scanAdded: string;
    scanChanged: string;
    scanDetailsAction: string;
    scanHeading: string;
    scanRemoved: string;
    scanWarnings: string;
    syncDetailsHeading: string;
    distributionHeading: string;
    autoDistribution: string;
    autoDistributionEnabled: string;
    autoDistributionDisabled: string;
    distributionEligible: string;
    distributionInstalled: string;
    distributionUpdated: string;
    distributionSkipped: string;
    distributionConflicts: string;
    distributionBlocked: string;
    distributionFailed: string;
  };
  repository: RepositoryViewModel | null;
  onCopyCachePath: () => void;
  onDelete: () => void;
  onEdit: () => void;
  onOpenLocation: (location: string) => void;
};

export const RepositoryDetail = ({
  copy,
  repository,
  onCopyCachePath,
  onDelete,
  onEdit,
  onOpenLocation
}: RepositoryDetailProps) => {
  const [activeSyncDetailGroups, setActiveSyncDetailGroups] = React.useState<SyncDetailGroupKey[]>(
    []
  );
  const lastSyncSummary = repository?.lastSyncSummary ?? null;
  const scanDetails = lastSyncSummary?.scan;
  const scanRows = repository
    ? [
        {
          key: "added" as const,
          label: copy.scanAdded,
          skills: scanDetails?.added ?? [],
          value: repository.scan.added
        },
        {
          key: "changed" as const,
          label: copy.scanChanged,
          skills: scanDetails?.changed ?? [],
          value: repository.scan.changed
        },
        {
          key: "removed" as const,
          label: copy.scanRemoved,
          skills: scanDetails?.removed ?? [],
          value: repository.scan.removed
        }
      ]
    : [];
  const distribution = lastSyncSummary?.distribution;
  const hasDistributionSummary = distribution
    ? distribution.autoDistributionEnabled ||
      distribution.eligible > 0 ||
      distribution.installed > 0 ||
      distribution.updated > 0 ||
      distribution.skipped > 0 ||
      distribution.conflicts > 0 ||
      distribution.blocked > 0 ||
      distribution.failed > 0
    : false;
  const distributionRows = distribution
    ? ([
        [
          copy.autoDistribution,
          distribution.autoDistributionEnabled
            ? copy.autoDistributionEnabled
            : copy.autoDistributionDisabled
        ],
        [copy.distributionEligible, distribution.eligible],
        [copy.distributionInstalled, distribution.installed],
        [copy.distributionUpdated, distribution.updated],
        [copy.distributionSkipped, distribution.skipped],
        [copy.distributionConflicts, distribution.conflicts],
        [copy.distributionBlocked, distribution.blocked],
        [copy.distributionFailed, distribution.failed]
      ] satisfies Array<[string, string | number]>)
    : [];
  const isLocalRepository = repository?.provider === "Local";
  const detailDescription = repository ? repository.note : copy.defaultDescription;

  React.useEffect(() => {
    setActiveSyncDetailGroups([]);
  }, [repository?.id]);

  return (
    <>
      <section className="rounded-xl border border-border bg-card p-4">
        <h2 className="text-xl font-semibold">
          {repository ? repository.name : copy.defaultTitle}
        </h2>
        {detailDescription ? (
          <p className="mt-3 text-sm leading-6 text-muted-foreground">{detailDescription}</p>
        ) : null}
        <div className="mt-4 flex flex-wrap gap-2">
          <Button type="button" variant="outline" disabled={!repository} onClick={onEdit}>
            {copy.edit}
          </Button>
          <Button type="button" variant="outline" disabled={!repository} onClick={onCopyCachePath}>
            {copy.copyCache}
          </Button>
          <Button type="button" variant="destructive" disabled={!repository} onClick={onDelete}>
            {copy.delete}
          </Button>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-4">
        <h3 className="font-semibold">{copy.provider}</h3>
        {repository ? (
          <div className="mt-3 grid gap-2">
            <DetailRow label={copy.provider} value={repository.provider} />
            <DetailRow
              label={copy.remoteUrl}
              value={repository.remoteUrl}
              mono
              breakMode="all"
              openLabel={copy.openLocation(repository.remoteUrl)}
              onOpen={() => onOpenLocation(repository.remoteUrl)}
            />
            {!isLocalRepository ? (
              <>
                <DetailRow label={copy.branch} value={repository.branch} mono breakMode="all" />
                <DetailRow
                  label={copy.lastCommit}
                  value={repository.lastCommit}
                  mono
                  breakMode="all"
                />
              </>
            ) : null}
            <DetailRow label={copy.lastScan} value={repository.lastScanTime} />
            <DetailRow
              label={copy.enabled}
              value={repository.enabled ? copy.enabledYes : copy.enabledNo}
            />
            <DetailRow label={copy.patterns} value={repository.patterns.join(", ")} mono />
          </div>
        ) : null}
      </section>

      <section className="rounded-xl border border-border bg-card p-4">
        <h3 className="font-semibold">{copy.scanHeading}</h3>
        <Accordion.Root<SyncDetailGroupKey>
          value={activeSyncDetailGroups}
          onValueChange={(value) => setActiveSyncDetailGroups(value)}
          className="mt-3 grid gap-2"
        >
          {scanRows.map((group) => {
            const canShowDetails = group.skills.length > 0 && group.value > 0;
            const content = (
              <>
                <span>
                  <strong className="block text-sm">{group.label}</strong>
                  <span className="text-xs text-muted-foreground">
                    {repository?.lastScanTime ?? "--"}
                  </span>
                </span>
                <span className="font-mono text-sm">{group.value}</span>
              </>
            );

            return canShowDetails ? (
              <Accordion.Item key={group.key} value={group.key}>
                <Accordion.Header className="contents">
                  <Accordion.Trigger
                    title={copy.scanDetailsAction}
                    className={cn(
                      "grid w-full grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 rounded-lg border border-border bg-muted/40 p-3 text-left outline-none transition-colors",
                      "cursor-pointer hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
                    )}
                  >
                    {content}
                    <ListTree className="size-4 text-muted-foreground" aria-hidden="true" />
                  </Accordion.Trigger>
                </Accordion.Header>
                <Accordion.Panel className="pt-2">
                  <section className="rounded-lg border border-border bg-muted/40 p-3">
                    <h4 className="font-semibold">{copy.syncDetailsHeading}</h4>
                    <div className="mt-3 rounded-lg border border-border bg-background/60 p-3">
                      <strong className="block text-sm">{group.label}</strong>
                      <ul className="mt-2 grid gap-1 text-sm">
                        {group.skills.map((skill) => (
                          <li key={skill.skillUnitId} className="min-w-0">
                            <span className="block truncate">{skill.name}</span>
                            <span className="block truncate font-mono text-xs text-muted-foreground">
                              {skill.skillKey}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </section>
                </Accordion.Panel>
              </Accordion.Item>
            ) : (
              <div
                key={group.key}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-lg border border-border bg-muted/40 p-3"
              >
                {content}
              </div>
            );
          })}
        </Accordion.Root>
      </section>

      {repository && hasDistributionSummary ? (
        <section className="rounded-xl border border-border bg-card p-4">
          <h3 className="font-semibold">{copy.distributionHeading}</h3>
          <div className="mt-3 grid gap-2">
            {distributionRows.map(([label, value]) => (
              <div
                key={label}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-lg border border-border bg-muted/40 p-3"
              >
                <strong className="block text-sm">{label}</strong>
                <span className="font-mono text-sm">{value}</span>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
};
