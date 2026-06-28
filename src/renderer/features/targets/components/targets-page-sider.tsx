import React from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { TargetStatusBadge } from "./targets-page-main";
import { useTargetsPageContext } from "./targets-page-context";

export const TargetsPageSider = () => {
  const { t } = useTranslation();
  const { copySelectedTargetPath, isDeletingTargets, openDeleteDialog, selectedTarget } =
    useTargetsPageContext();

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
        <h2 className="truncate text-xl font-semibold">{selectedTarget.name}</h2>
        <p
          className="mt-3 break-all font-mono text-xs leading-5 text-muted-foreground"
          title={selectedTarget.path}
        >
          {selectedTarget.path}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={copySelectedTargetPath}>
            {t("targets.actions.copyTarget")}
          </Button>
          {selectedTarget.deletable ? (
            <Button
              type="button"
              variant="destructive"
              disabled={isDeletingTargets}
              onClick={() => openDeleteDialog([selectedTarget.id])}
            >
              {t("targets.actions.deleteSelected")}
            </Button>
          ) : null}
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-semibold">{t("targets.detail.scanResult")}</h3>
          <TargetStatusBadge status={selectedTarget.status} />
        </div>
        {selectedTarget.scanMessage ? (
          <p
            className="mt-3 text-sm leading-6 text-muted-foreground"
            title={selectedTarget.scanMessage}
          >
            {selectedTarget.scanMessage}
          </p>
        ) : null}
      </section>

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
