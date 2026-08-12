import { Badge } from "@/components/ui/badge";
import type { CatalogSkill } from "@/global";
import { ChevronRight, Download } from "lucide-react";
import React from "react";
import { useTranslation } from "react-i18next";
import { formatCompact, sourceTypeLabel } from "../discover-utils";

type SkillCardProps = {
  skill: CatalogSkill;
  onOpenDetail: (skill: CatalogSkill) => void;
};

export const SkillCard = ({ skill, onOpenDetail }: SkillCardProps) => {
  const { t } = useTranslation();

  return (
    <article className="group relative grid content-start gap-2 rounded-xl border border-border bg-card p-3.5 transition-colors hover:border-primary/40 hover:bg-muted/40 focus-within:border-ring">
      {/* Primary row: name + installs */}
      <div className="flex items-start justify-between gap-2">
        <h2 className="min-w-0 truncate text-sm font-semibold text-foreground" title={skill.name}>
          {skill.name}
        </h2>
        <span
          className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap text-xs tabular-nums text-muted-foreground"
          title={`${skill.installs.toLocaleString()} installs`}
        >
          <Download className="size-3" aria-hidden="true" />
          {formatCompact(skill.installs)}
        </span>
      </div>

      {/* Source line: a machine identifier, so mono like the provider list */}
      <p className="min-w-0 truncate font-mono text-xs text-muted-foreground" title={skill.source}>
        {skill.source}
      </p>

      {/* Trailing row: source type badge + detail affordance (non-interactive) */}
      <div className="flex items-center justify-between gap-2">
        <Badge variant="outline" className="font-normal">
          {sourceTypeLabel(t, skill.sourceType)}
        </Badge>
        <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground transition-colors group-hover:text-primary">
          {t("discover.card.openDetail")}
          <ChevronRight className="size-3" aria-hidden="true" />
        </span>
      </div>

      {/* Stretched trigger: the card's only interactive element, so there is no
          nested-click conflict and the card is a single tab stop. */}
      <button
        type="button"
        onClick={() => onOpenDetail(skill)}
        aria-label={t("discover.card.openDetailAria", { name: skill.name })}
        className="absolute inset-0 cursor-pointer rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      />
    </article>
  );
};
