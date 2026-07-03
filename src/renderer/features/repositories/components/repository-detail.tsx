import { Button } from "@/components/ui/button";
import { DetailRow } from "@/components/detail-row";
import type { RepositoryViewModel } from "./repository-data";
import React from "react";

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
  const scanRows = repository
    ? ([
        [copy.scanAdded, repository.scan.added],
        [copy.scanChanged, repository.scan.changed],
        [copy.scanRemoved, repository.scan.removed]
      ] satisfies Array<[string, number]>)
    : [];
  const lastSyncSummary = repository?.lastSyncSummary ?? null;
  const scanDetails = lastSyncSummary?.scan;
  const skillGroups = scanDetails
    ? [
        { label: copy.scanAdded, skills: scanDetails.added },
        { label: copy.scanChanged, skills: scanDetails.changed },
        { label: copy.scanRemoved, skills: scanDetails.removed }
      ]
    : [];
  const hasSyncDetails =
    skillGroups.some((group) => group.skills.length > 0) || Boolean(scanDetails?.warnings.length);
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
        <div className="mt-3 grid gap-2">
          {scanRows.map(([label, value]) => (
            <div
              key={label}
              className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-lg border border-border bg-muted/40 p-3"
            >
              <span>
                <strong className="block text-sm">{label}</strong>
                <span className="text-xs text-muted-foreground">
                  {repository?.lastScanTime ?? "--"}
                </span>
              </span>
              <span className="font-mono text-sm">{value}</span>
            </div>
          ))}
        </div>
      </section>

      {repository && hasSyncDetails ? (
        <section className="rounded-xl border border-border bg-card p-4">
          <h3 className="font-semibold">{copy.syncDetailsHeading}</h3>
          <div className="mt-3 grid gap-3">
            {skillGroups.map((group) =>
              group.skills.length > 0 ? (
                <div key={group.label} className="rounded-lg border border-border bg-muted/40 p-3">
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
              ) : null
            )}
            {scanDetails?.warnings.length ? (
              <div className="rounded-lg border border-border bg-muted/40 p-3">
                <strong className="block text-sm">{copy.scanWarnings}</strong>
                <ul className="mt-2 grid gap-1 text-sm text-muted-foreground">
                  {scanDetails.warnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

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
