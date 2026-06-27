import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogBackdrop,
  DialogClose,
  DialogDescription,
  DialogPopup,
  DialogPortal,
  DialogTitle
} from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import React from "react";
import { useTranslation } from "react-i18next";

import { useSkillsPageContext } from "./skills-page-context";
import { getDistributionTitleKey, getSkillDistributionState } from "./skills-page-data";
import type { SkillsPageState } from "../hooks/use-skills-page-state";

export const SkillsPageSider = () => {
  const { t } = useTranslation();
  const page = useSkillsPageContext();
  const { selectedSkill } = page;

  if (!selectedSkill) {
    return (
      <section className="min-w-0 rounded-xl border border-border bg-card p-4">
        <h2 className="text-xl font-semibold">{t("skills.detail.emptyTitle")}</h2>
      </section>
    );
  }

  const distributionState = getSkillDistributionState(selectedSkill);
  const distributionReady = distributionState === "ready";
  const syncTitle = t(getDistributionTitleKey(distributionState, "single"));
  const targetOptions = page.selectedSkillTargetOptions;
  const planItems =
    page.distributionPreview?.items.filter((item) => item.skillUnitId === selectedSkill.id) ?? [];
  const canAddSyncTarget =
    Boolean(window.skillsManager?.selectTargetDirectory) &&
    Boolean(window.skillsManager?.addSkillDirectoryTarget);
  const canPreviewDistribution = Boolean(window.skillsManager?.previewDistributionPlan);

  return (
    <>
      <section className="min-w-0 rounded-xl border border-border bg-card p-4">
        <h2 className="text-xl font-semibold">{selectedSkill.name}</h2>
        <SkillDescription description={selectedSkill.description} />
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={
              !distributionReady || !canPreviewDistribution || page.isDistributionPreviewLoading
            }
            title={
              canPreviewDistribution ? syncTitle : t("skills.actions.previewUnavailableStatus")
            }
            onClick={page.previewSelectedSkillDistribution}
          >
            {t("skills.actions.preview")}
          </Button>
          <Button
            type="button"
            disabled={!distributionReady}
            title={syncTitle}
            aria-label={t("skills.actions.syncCurrentSkillAria")}
            onClick={page.announceDistributionUnavailable}
          >
            {t("skills.actions.sync")}
          </Button>
        </div>
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
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!canAddSyncTarget}
              title={canAddSyncTarget ? undefined : t("skills.actions.addSyncTargetUnavailable")}
              onClick={page.addSyncTargetForSelectedSkill}
            >
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
                  aria-label={t("skills.detail.chooseTarget", {
                    name: target.name.startsWith("skills.") ? t(target.name) : target.name
                  })}
                  onCheckedChange={(nextChecked) => {
                    page.toggleSkillTargetPreference(selectedSkill.id, target.id, nextChecked);
                  }}
                />
              </label>
            );
          })}
        </div>
      </section>

      <DistributionPreviewDialog
        copy={{
          close: t("skills.actions.close"),
          description: t("skills.detail.planPreviewDescription"),
          title: t("skills.detail.planPreview")
        }}
        items={planItems}
        onClose={page.closeDistributionPreviewDialog}
        open={page.distributionPreviewDialogOpen && planItems.length > 0}
      />

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

const DistributionPreviewDialog = ({
  copy,
  items,
  onClose,
  open
}: {
  copy: {
    close: string;
    description: string;
    title: string;
  };
  items: NonNullable<SkillsPageState["distributionPreview"]>["items"];
  onClose: () => void;
  open: boolean;
}) => {
  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogPortal>
        <DialogBackdrop />
        <DialogPopup>
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <DialogTitle>{copy.title}</DialogTitle>
              <DialogDescription>{copy.description}</DialogDescription>
            </div>
            <DialogClose render={<Button type="button" variant="outline" size="sm" />}>
              {copy.close}
            </DialogClose>
          </div>

          <div className="grid gap-2">
            {items.map((item) => (
              <div key={item.id} className="rounded-lg border border-border bg-background p-3">
                <div className="flex items-center justify-between gap-2">
                  <strong className="min-w-0 truncate text-sm">{item.targetName}</strong>
                  <Badge variant={getPlanActionBadgeVariant(item.action)}>{item.action}</Badge>
                </div>
                <p className="mt-2 break-all font-mono text-xs text-muted-foreground">
                  {item.targetPath}
                </p>
                {item.reason ? (
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">{item.reason}</p>
                ) : null}
              </div>
            ))}
          </div>
        </DialogPopup>
      </DialogPortal>
    </Dialog>
  );
};

const getPlanActionBadgeVariant = (
  action: "install" | "update" | "skip" | "conflict"
): React.ComponentProps<typeof Badge>["variant"] => {
  if (action === "conflict") {
    return "destructive";
  }

  if (action === "skip") {
    return "outline";
  }

  return "secondary";
};

const SkillDescription = ({ description }: { description: string }) => {
  const descriptionRef = React.useRef<HTMLParagraphElement | null>(null);
  const [isOverflowing, setIsOverflowing] = React.useState(false);

  React.useLayoutEffect(() => {
    const measureDescription = () => {
      const element = descriptionRef.current;

      if (!element) {
        setIsOverflowing(false);
        return;
      }

      setIsOverflowing(element.scrollHeight > element.clientHeight + 1);
    };

    measureDescription();

    if (typeof ResizeObserver === "undefined" || !descriptionRef.current) {
      window.addEventListener("resize", measureDescription);
      return () => window.removeEventListener("resize", measureDescription);
    }

    const observer = new ResizeObserver(measureDescription);

    observer.observe(descriptionRef.current);

    return () => observer.disconnect();
  }, [description]);

  const descriptionElement = (
    <p
      ref={descriptionRef}
      tabIndex={isOverflowing ? 0 : undefined}
      className="mt-3 line-clamp-5 max-w-full break-all text-sm leading-6 text-muted-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      {description}
    </p>
  );

  if (!isOverflowing) {
    return descriptionElement;
  }

  return (
    <Tooltip>
      <TooltipTrigger render={descriptionElement} />
      <TooltipContent
        side="left"
        align="center"
        className="max-w-sm whitespace-normal break-all leading-5"
      >
        {description}
      </TooltipContent>
    </Tooltip>
  );
};
