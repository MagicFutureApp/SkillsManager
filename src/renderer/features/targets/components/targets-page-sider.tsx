import React from "react";
import { useTranslation } from "react-i18next";

import { TargetScopeBadge, TargetStatusBadge } from "./targets-page-main";
import { useTargetsPageContext } from "./targets-page-context";

export const TargetsPageSider = () => {
  const { t } = useTranslation();
  const { selectedTarget } = useTargetsPageContext();

  if (!selectedTarget) {
    return (
      <section className="rounded-xl border border-border bg-card p-4">
        <h2 className="text-xl font-semibold">{t("targets.detail.emptyTitle")}</h2>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          {t("targets.detail.emptyDescription")}
        </p>
      </section>
    );
  }

  return (
    <>
      <section className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="truncate text-xl font-semibold">{selectedTarget.name}</h2>
            <p className="mt-2 truncate font-mono text-xs text-muted-foreground">
              {selectedTarget.type}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap justify-end gap-2">
            <TargetScopeBadge scope={selectedTarget.scope} />
            <TargetStatusBadge status={selectedTarget.status} />
          </div>
        </div>
      </section>

      {selectedTarget.scanMessage ? (
        <section className="rounded-xl border border-border bg-card p-4">
          <h3 className="font-semibold">{t("targets.detail.scanResult")}</h3>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            {selectedTarget.scanMessage}
          </p>
        </section>
      ) : null}

      <section className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-semibold">{t("targets.detail.selectedSkills")}</h3>
          <span className="font-mono text-xs text-muted-foreground">
            {t("targets.table.skillCount", { count: selectedTarget.skillCount })}
          </span>
        </div>
        {selectedTarget.selectedSkills.length ? (
          <div className="mt-3 grid gap-2">
            {selectedTarget.selectedSkills.map((skill) => (
              <div key={skill.id} className="rounded-lg border border-border bg-muted/40 p-2">
                <strong className="block truncate text-sm">{skill.name}</strong>
                <span className="block truncate text-xs text-muted-foreground">
                  {skill.repository}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            {t("targets.detail.noSelectedSkills")}
          </p>
        )}
      </section>
    </>
  );
};
