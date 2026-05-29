import React from "react";

type RepositorySummaryProps = {
  copy: {
    enabledRepositories: string;
    indexedSkills: string;
    needsReview: string;
    registered: string;
    scanAttention: string;
    skillUnit: string;
  };
  enabledCount: number;
  reviewCount: number;
  skillUnits: number;
  totalCount: number;
};

export const RepositorySummary = ({
  copy,
  enabledCount,
  reviewCount,
  skillUnits,
  totalCount
}: RepositorySummaryProps) => {
  return (
    <section className="grid grid-cols-3 gap-3 max-[820px]:grid-cols-2" aria-label="仓库摘要">
      <SummaryCard
        label={copy.enabledRepositories}
        meta={copy.registered}
        value={`${enabledCount}/${totalCount}`}
      />
      <SummaryCard label={copy.indexedSkills} meta={copy.skillUnit} value={String(skillUnits)} />
      <SummaryCard label={copy.needsReview} meta={copy.scanAttention} value={String(reviewCount)} />
    </section>
  );
};

const SummaryCard = ({ label, meta, value }: { label: string; meta: string; value: string }) => {
  return (
    <article className="rounded-xl border border-border bg-card p-4">
      <p className="text-2xl font-semibold leading-tight">{value}</p>
      <p className="mt-1 text-sm font-semibold">{label}</p>
      <p className="mt-1 font-mono text-xs text-muted-foreground">{meta}</p>
    </article>
  );
};
