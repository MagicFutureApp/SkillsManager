import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import React from "react";
import { useTranslation } from "react-i18next";

import { useSkillsPageContext } from "./skills-page-context";
import { getDistributionTitleKey, getSkillDistributionState } from "./skills-page-data";

export const SkillsPageSider = () => {
  const { t } = useTranslation();
  const page = useSkillsPageContext();
  const { selectedSkill } = page;

  if (!selectedSkill) {
    return (
      <section className="rounded-xl border border-border bg-card p-4">
        <h2 className="text-xl font-semibold">{t("skills.detail.emptyTitle")}</h2>
      </section>
    );
  }

  const distributionState = getSkillDistributionState(selectedSkill);
  const distributionReady = distributionState === "ready";
  const syncTitle = t(getDistributionTitleKey(distributionState, "single"));
  const targetOptions = page.selectedSkillTargetOptions;

  return (
    <>
      <section className="rounded-xl border border-border bg-card p-4">
        <h2 className="text-xl font-semibold">{selectedSkill.name}</h2>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">{selectedSkill.description}</p>
        <Button className="mt-3" type="button" variant="outline">
          {t("skills.actions.editSkill")}
        </Button>
      </section>

      <section className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-semibold">{t("skills.detail.syncTargets")}</h3>
            <p className="mt-4 text-sm leading-6 text-muted-foreground">
              {t("skills.detail.syncTargetsDescription")}
            </p>
          </div>
          <div className="grid justify-items-end gap-2">
            <span className="font-mono text-xs text-muted-foreground">
              {selectedSkill.targets.length} / {targetOptions.length}
            </span>
            <Button type="button" variant="outline" size="sm">
              {t("skills.actions.addSyncTarget")}
            </Button>
          </div>
        </div>

        <div className="mt-3 grid gap-2">
          {targetOptions.map((target) => {
            const checked = selectedSkill.targets.includes(target.id);

            return (
              <label
                key={target.id}
                className={cn(
                  "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-lg border p-3",
                  checked ? "border-primary/40 bg-primary/5" : "border-border bg-background"
                )}
              >
                <span className="min-w-0">
                  <strong className="block text-sm">
                    {target.name.startsWith("skills.") ? t(target.name) : target.name}
                  </strong>
                  <span className="block truncate font-mono text-xs text-muted-foreground">
                    {target.path}
                  </span>
                </span>
                <Checkbox
                  checked={checked}
                  readOnly
                  aria-label={t("skills.detail.chooseTarget", {
                    name: target.name.startsWith("skills.") ? t(target.name) : target.name
                  })}
                />
              </label>
            );
          })}
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-4">
        <h3 className="font-semibold">{t("skills.detail.planPreview")}</h3>
        <p className="mt-7 text-sm leading-6 text-muted-foreground">
          {t("skills.detail.planPreviewDescription")}
        </p>
        <p className="mt-14 text-sm text-muted-foreground">{t("skills.detail.planPreviewEmpty")}</p>
      </section>

      <div className="grid grid-cols-2 gap-2">
        <Button type="button" variant="outline">
          {t("skills.actions.preview")}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={!distributionReady}
          title={syncTitle}
          aria-label={t("skills.actions.syncCurrentSkillAria")}
          onClick={page.announceDistributionUnavailable}
        >
          {t("skills.actions.sync")}
        </Button>
      </div>

      <section className="rounded-xl border border-border bg-card p-4">
        <h3 className="font-semibold">{t("skills.detail.details")}</h3>
        <div className="mt-3 grid gap-2">
          {[
            [t("skills.detail.skillId"), selectedSkill.skillId],
            [t("skills.detail.repository"), selectedSkill.repository],
            [t("skills.detail.entryFile"), selectedSkill.entry],
            [t("skills.detail.version"), selectedSkill.version],
            [t("skills.detail.tags"), selectedSkill.tags.join(", ")]
          ].map(([label, value]) => (
            <div key={label} className="rounded-lg border border-border bg-muted/40 p-2">
              <span className="text-xs font-semibold text-muted-foreground">{label}</span>
              <p className="mt-1 break-words text-sm">{value}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
};
