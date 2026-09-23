import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LoaderCircle, RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";
import React from "react";

import type { Best100SkillRecord, Best100SyncState } from "@/global";
import { useRecommendedPageContext } from "./recommended-page-context";

const formatDateTime = (value: string | null): string => {
  if (!value) {
    return "--";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "--";
  }

  return date.toLocaleString();
};

const getSyncStatusVariant = (
  status: Best100SyncState["status"] | undefined
): React.ComponentProps<typeof Badge>["variant"] => {
  if (status === "success" || status === "idle") {
    return "secondary";
  }

  if (status === "failed" || status === "unconfigured") {
    return "destructive";
  }

  return "outline";
};

export const RecommendedPageSider = () => {
  const { t } = useTranslation();
  const page = useRecommendedPageContext();
  const { selectedSkill } = page;

  if (!selectedSkill) {
    return (
      <section className="min-w-0 rounded-xl border border-border bg-card p-4">
        <h2 className="text-xl font-semibold">{t("recommended.detail.emptyTitle")}</h2>
      </section>
    );
  }

  const skill = selectedSkill;
  const sourceLink = page.resolveSkillLink(skill);

  return (
    <>
      <section className="min-w-0 rounded-xl border border-border bg-card p-4">
        <h2 className="text-xl font-semibold">{skill.skill || "--"}</h2>
        <p className="mt-2 break-words text-sm leading-6 text-muted-foreground">
          {skill.descriptionZh || skill.description || "--"}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            type="button"
            disabled={page.isSyncing}
            title={t("recommended.actions.syncAria")}
            aria-label={t("recommended.actions.syncAria")}
            onClick={() => void page.syncNow()}
          >
            {page.isSyncing ? (
              <>
                <LoaderCircle aria-hidden="true" className="animate-spin" />
                {t("recommended.actions.syncing")}
              </>
            ) : (
              <>
                <RefreshCw aria-hidden="true" />
                {t("recommended.actions.sync")}
              </>
            )}
          </Button>
        </div>
      </section>

      <section className="min-w-0 rounded-xl border border-border bg-card p-4">
        <h3 className="font-semibold">{t("recommended.detail.ariaLabel")}</h3>
        <div className="mt-3 grid gap-2">
          <DetailRow label={t("recommended.detail.rank")} value={String(skill.rank || "--")} />
          <DetailRow label={t("recommended.detail.vendor")} value={skill.vendor} />
          <DetailRow label={t("recommended.detail.platform")} value={skill.platform} />
          <DetailRow
            label={t("recommended.detail.source")}
            value={sourceLink ?? skill.sourceSkillssh ?? undefined}
            link={sourceLink ?? undefined}
            onLinkClick={sourceLink ? () => void page.openExternal(sourceLink) : undefined}
          />
          <DetailRow label={t("recommended.detail.installs")} value={skill.installsSkillssh} />
          <DetailRow
            label={t("recommended.detail.downloadsClawhub")}
            value={skill.downloadsClawhub}
          />
          <DetailRow
            label={t("recommended.detail.downloadsSkillhubCn")}
            value={skill.downloadsSkillhubCn}
          />
          <DetailRow label={t("recommended.detail.score")} value={skill.wis} />
        </div>
      </section>

      <RecommendedSyncPanel />
    </>
  );
};

const RecommendedSyncPanel = () => {
  const { t } = useTranslation();
  const page = useRecommendedPageContext();
  const state = page.status?.state ?? null;

  return (
    <section className="rounded-xl border border-border bg-card p-4">
      <h3 className="font-semibold">{t("recommended.sync.title")}</h3>

      <div className="mt-3 grid gap-2">
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-semibold text-muted-foreground">
            {t("recommended.sync.statusLabel")}
          </span>
          <Badge variant={getSyncStatusVariant(state?.status)}>
            {state ? t(`recommended.sync.${state.status}`) : t("recommended.sync.unconfigured")}
          </Badge>
        </div>
        <DetailRow
          label={t("recommended.sync.attempts")}
          value={state ? String(state.attempts) : "--"}
        />
        <DetailRow
          label={t("recommended.sync.lastAttempt")}
          value={formatDateTime(state?.lastAttemptAt ?? null)}
        />
        <DetailRow
          label={t("recommended.sync.lastSuccess")}
          value={formatDateTime(state?.lastSuccessAt ?? null)}
        />
        {state?.lastError ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-2">
            <span className="text-xs font-semibold text-muted-foreground">
              {t("recommended.sync.lastError")}
            </span>
            <p className="mt-1 break-all text-xs leading-5 text-destructive">{state.lastError}</p>
          </div>
        ) : null}
      </div>
    </section>
  );
};

const DetailRow = ({
  hidden,
  hiddenLabel,
  label,
  link,
  onLinkClick,
  value
}: {
  hidden?: boolean;
  hiddenLabel?: string;
  label: string;
  link?: string;
  onLinkClick?: () => void;
  value?: string | null;
}) => {
  if (hidden) {
    return null;
  }

  const isLink = Boolean(link && onLinkClick && value);

  return (
    <div className="min-w-0 rounded-lg border border-border bg-muted/40 p-2">
      <span className="text-xs font-semibold text-muted-foreground">{label}</span>
      {isLink ? (
        <button
          type="button"
          className="mt-1 block w-full min-w-0 break-all text-left text-sm text-primary underline-offset-2 hover:underline focus-visible:underline"
          onClick={onLinkClick}
        >
          {value}
        </button>
      ) : (
        <p className="mt-1 min-w-0 break-words text-sm">{value || hiddenLabel || "--"}</p>
      )}
    </div>
  );
};
