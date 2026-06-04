import { Button } from "@/components/ui/button";
import type { RepositoryViewModel } from "./repository-data";
import React from "react";

type RepositoryDetailProps = {
  copy: {
    branch: string;
    cachePath: string;
    copyCache: string;
    defaultDescription: string;
    defaultTitle: string;
    edit: string;
    enabled: string;
    lastCommit: string;
    lastScan: string;
    patterns: string;
    provider: string;
    remoteUrl: string;
    scanAdded: string;
    scanChanged: string;
    scanHeading: string;
    scanRemoved: string;
    scanWarnings: string;
  };
  repository: RepositoryViewModel | null;
  onCopyCachePath: () => void;
  onEdit: () => void;
};

export const RepositoryDetail = ({
  copy,
  repository,
  onCopyCachePath,
  onEdit
}: RepositoryDetailProps) => {
  const scanRows = repository
    ? ([
        [copy.scanAdded, repository.scan.added],
        [copy.scanRemoved, repository.scan.removed],
        [copy.scanChanged, repository.scan.changed],
        [copy.scanWarnings, repository.scan.warnings]
      ] satisfies Array<[string, number]>)
    : [];

  return (
    <aside
      className="grid content-start gap-3 border-l border-border bg-card px-5 py-6"
      aria-label="来源详情"
    >
      <section className="rounded-xl border border-border bg-card p-4">
        <h2 className="text-xl font-semibold">
          {repository ? repository.name : copy.defaultTitle}
        </h2>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          {repository ? repository.note : copy.defaultDescription}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button type="button" variant="outline" disabled={!repository} onClick={onEdit}>
            {copy.edit}
          </Button>
          <Button type="button" variant="outline" disabled={!repository} onClick={onCopyCachePath}>
            {copy.copyCache}
          </Button>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-4">
        <h3 className="font-semibold">{copy.provider}</h3>
        {repository ? (
          <div className="mt-3 grid gap-2">
            <DetailRow label={copy.provider} value={repository.provider} />
            <DetailRow label={copy.remoteUrl} value={repository.remoteUrl} mono />
            <DetailRow label={copy.cachePath} value={repository.cachePath} mono />
            <DetailRow label={copy.branch} value={repository.branch} mono />
            <DetailRow label={copy.lastCommit} value={repository.lastCommit} mono />
            <DetailRow label={copy.lastScan} value={repository.lastScanLabel} />
            <DetailRow label={copy.enabled} value={String(repository.enabled)} mono />
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
                  {repository?.lastScanLabel ?? "--"}
                </span>
              </span>
              <span className="font-mono text-sm">{value}</span>
            </div>
          ))}
        </div>
      </section>
    </aside>
  );
};

const DetailRow = ({ label, mono, value }: { label: string; mono?: boolean; value: string }) => {
  return (
    <div className="rounded-lg border border-border bg-muted/40 p-2">
      <span className="text-xs font-semibold text-muted-foreground">{label}</span>
      <p className={mono ? "mt-1 break-words font-mono text-sm" : "mt-1 break-words text-sm"}>
        {value}
      </p>
    </div>
  );
};
