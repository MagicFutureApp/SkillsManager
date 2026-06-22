import { Button } from "@/components/ui/button";
import { DetailRow } from "@/components/detail-row";
import type { RepositoryViewModel } from "./repository-data";
import { Trash2 } from "lucide-react";
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
    scanHeading: string;
    scanRemoved: string;
    scanWarnings: string;
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
        [copy.scanRemoved, repository.scan.removed]
      ] satisfies Array<[string, number]>)
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
            <Trash2 aria-hidden="true" />
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
    </>
  );
};
