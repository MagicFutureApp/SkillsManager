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
import { AlertCircle, CheckCircle2, CircleMinus, LoaderCircle } from "lucide-react";
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
  const previewItems = page.distributionPreview?.items ?? [];
  const canAddSyncTarget =
    Boolean(window.skillsManager?.selectTargetDirectory) &&
    Boolean(window.skillsManager?.addSkillDirectoryTarget);

  return (
    <>
      <section className="min-w-0 rounded-xl border border-border bg-card p-4">
        <h2 className="text-xl font-semibold">{selectedSkill.name}</h2>
        <SkillDescription description={selectedSkill.description} />
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            type="button"
            disabled={!distributionReady || page.isDistributionPreviewLoading}
            title={syncTitle}
            aria-label={t("skills.actions.syncCurrentSkillAria")}
            onClick={page.startSelectedSkillDistribution}
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

      <DistributionConfirmationDialog
        conflictResolutions={page.distributionConflictResolutions}
        executionItemStatuses={page.distributionExecutionItemStatuses}
        runtimeOverwriteResolutions={page.distributionRuntimeOverwriteResolutions}
        isExecuting={page.isDistributionExecuting}
        items={previewItems}
        onClose={page.closeDistributionConfirmDialog}
        onConfirm={page.executeCurrentDistribution}
        onConflictResolutionChange={page.setDistributionConflictResolution}
        onRuntimeOverwriteResolutionChange={page.setDistributionRuntimeOverwriteResolution}
        open={page.distributionConfirmDialogOpen && previewItems.length > 0}
      />

      <SkillTargetRemovalDialog
        isExecuting={page.isTargetRemovalExecuting}
        onClose={page.closeTargetRemovalDialog}
        onConfirm={page.confirmTargetRemoval}
        removal={page.pendingTargetRemoval}
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

const SkillTargetRemovalDialog = ({
  isExecuting,
  onClose,
  onConfirm,
  removal
}: {
  isExecuting: boolean;
  onClose: () => void;
  onConfirm: (input: { deleteInstalledFiles: boolean; removeTargetPreference: boolean }) => void;
  removal: SkillsPageState["pendingTargetRemoval"];
}) => {
  const { t } = useTranslation();
  const [removeTarget, setRemoveTarget] = React.useState(false);
  const [deleteInstalledFiles, setDeleteInstalledFiles] = React.useState(false);

  React.useEffect(() => {
    if (removal) {
      setRemoveTarget(false);
      setDeleteInstalledFiles(false);
    }
  }, [removal]);

  if (!removal) {
    return null;
  }

  const targetName = removal.targetName.startsWith("skills.")
    ? t(removal.targetName)
    : removal.targetName;
  const canRemoveTargetPreference = removal.targetScope === "independent";

  return (
    <Dialog open={Boolean(removal)} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogPortal>
        <DialogBackdrop />
        <DialogPopup>
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <DialogTitle>{t("skills.targetRemoval.title")}</DialogTitle>
            </div>
            <DialogClose
              disabled={isExecuting}
              render={<Button type="button" variant="outline" size="sm" />}
            >
              {t("skills.actions.close")}
            </DialogClose>
          </div>

          <div className="grid gap-2 rounded-lg border border-border bg-background px-3 py-2.5">
            <div>
              <span className="text-xs font-semibold text-muted-foreground">
                {t("skills.targetRemoval.skill")}
              </span>
              <p className="mt-0.5 break-words text-sm font-medium leading-5">
                {removal.skillName}
              </p>
            </div>
            <div>
              <span className="text-xs font-semibold text-muted-foreground">
                {t("skills.targetRemoval.target")}
              </span>
              <p className="mt-0.5 break-words text-sm font-medium leading-5">{targetName}</p>
              <p className="mt-0.5 break-all font-mono text-xs leading-5 text-muted-foreground">
                {removal.targetPath}
              </p>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div
              role="group"
              aria-label={t("skills.targetRemoval.options")}
              className="flex flex-wrap items-center gap-x-4 gap-y-2"
            >
              {canRemoveTargetPreference ? (
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Checkbox
                    checked={removeTarget}
                    disabled={isExecuting}
                    aria-label={t("skills.targetRemoval.removeTarget")}
                    onCheckedChange={(nextChecked) => setRemoveTarget(Boolean(nextChecked))}
                  />
                  <span>{t("skills.targetRemoval.removeTarget")}</span>
                </div>
              ) : null}
              <div className="flex items-center gap-2 text-sm font-medium">
                <Checkbox
                  checked={deleteInstalledFiles}
                  disabled={isExecuting}
                  aria-label={t("skills.targetRemoval.deleteSkillFiles")}
                  onCheckedChange={(nextChecked) => setDeleteInstalledFiles(Boolean(nextChecked))}
                />
                <span>{t("skills.targetRemoval.deleteSkillFiles")}</span>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" disabled={isExecuting} onClick={onClose}>
                {t("skills.targetRemoval.cancel")}
              </Button>
              <Button
                type="button"
                className="sm:min-w-24"
                disabled={isExecuting}
                onClick={() =>
                  onConfirm({
                    deleteInstalledFiles,
                    removeTargetPreference: canRemoveTargetPreference && removeTarget
                  })
                }
              >
                {isExecuting ? (
                  <>
                    <LoaderCircle aria-hidden="true" className="animate-spin" />
                    {t("skills.targetRemoval.removing")}
                  </>
                ) : (
                  t("skills.targetRemoval.confirm")
                )}
              </Button>
            </div>
          </div>
        </DialogPopup>
      </DialogPortal>
    </Dialog>
  );
};

const DistributionConfirmationDialog = ({
  conflictResolutions,
  executionItemStatuses,
  runtimeOverwriteResolutions,
  isExecuting,
  items,
  onClose,
  onConfirm,
  onConflictResolutionChange,
  onRuntimeOverwriteResolutionChange,
  open
}: {
  conflictResolutions: SkillsPageState["distributionConflictResolutions"];
  executionItemStatuses: SkillsPageState["distributionExecutionItemStatuses"];
  runtimeOverwriteResolutions: SkillsPageState["distributionRuntimeOverwriteResolutions"];
  isExecuting: boolean;
  items: NonNullable<SkillsPageState["distributionPreview"]>["items"];
  onClose: () => void;
  onConfirm: () => void;
  onConflictResolutionChange: (previewItemId: string, resolution: "overwrite" | "skip") => void;
  onRuntimeOverwriteResolutionChange: (previewItemId: string, overwrite: boolean) => void;
  open: boolean;
}) => {
  const { t } = useTranslation();
  const executionStarted = Object.keys(executionItemStatuses).length > 0;
  const executionFinished = executionStarted && !isExecuting;
  const hasRuntimeOverwriteSelection = items.some((item) => {
    return canOverwriteRuntimeConflict(executionItemStatuses[item.id])
      ? runtimeOverwriteResolutions[item.id]
      : false;
  });

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogPortal>
        <DialogBackdrop />
        <DialogPopup>
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <DialogTitle>{t("skills.distribution.confirmTitle")}</DialogTitle>
              <DialogDescription>
                {t("skills.distribution.confirmDescription", { count: items.length })}
              </DialogDescription>
            </div>
            <DialogClose
              disabled={isExecuting}
              render={<Button type="button" variant="outline" size="sm" />}
            >
              {t("skills.actions.close")}
            </DialogClose>
          </div>

          <div className="grid gap-2">
            {items.map((item) => {
              const resolution =
                conflictResolutions[item.id] ?? item.defaultResolution ?? "overwrite";
              const allowedResolutions = item.allowedResolutions ?? ["overwrite", "skip"];
              const executionStatus = executionItemStatuses[item.id];
              const showRuntimeOverwriteControl = canOverwriteRuntimeConflict(executionStatus);

              return (
                <div
                  key={item.id}
                  data-testid={`distribution-preview-item-${item.id}`}
                  className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1 rounded-lg border border-border bg-background px-3 py-2"
                >
                  <strong
                    className="col-start-1 row-start-1 block min-w-0 truncate text-sm leading-5"
                    title={item.targetName}
                  >
                    {item.targetName}
                  </strong>
                  <p
                    className="col-start-1 row-start-2 min-w-0 truncate font-mono text-xs leading-4 text-muted-foreground"
                    title={item.targetPath}
                  >
                    {item.targetPath}
                  </p>
                  <div
                    data-testid={`distribution-status-slot-${item.id}`}
                    className="col-start-2 row-start-1 flex h-6 w-24 items-center justify-end gap-2"
                  >
                    {executionStatus ? (
                      <DistributionItemExecutionIcon
                        name={item.targetName}
                        status={executionStatus}
                      />
                    ) : (
                      <span aria-hidden="true" className="size-6" />
                    )}
                    <Badge variant={getDistributionActionBadgeVariant(item.action)}>
                      {t(`skills.distribution.actions.${item.action}`)}
                    </Badge>
                  </div>
                  <div
                    data-testid={`runtime-overwrite-slot-${item.id}`}
                    className="col-start-2 row-start-2 flex h-5 w-24 items-center justify-end"
                  >
                    {showRuntimeOverwriteControl ? (
                      <label className="flex h-5 cursor-pointer items-center gap-1.5 whitespace-nowrap text-xs font-medium text-red-500">
                        <Checkbox
                          checked={runtimeOverwriteResolutions[item.id] ?? false}
                          aria-label={t("skills.distribution.runtimeOverwriteAria", {
                            name: item.targetName
                          })}
                          disabled={isExecuting}
                          onCheckedChange={(nextChecked) =>
                            onRuntimeOverwriteResolutionChange(item.id, nextChecked)
                          }
                        />
                        {t("skills.distribution.runtimeOverwrite")}
                      </label>
                    ) : null}
                  </div>
                  {item.reason ? (
                    <p className="col-span-2 row-start-3 text-xs leading-5 text-muted-foreground">
                      {item.reason}
                    </p>
                  ) : null}
                  {item.action === "conflict" ? (
                    <label className="col-span-2 grid gap-1 text-xs font-semibold text-muted-foreground">
                      {t("skills.distribution.conflictResolution")}
                      <select
                        aria-label={t("skills.distribution.conflictResolutionAria", {
                          skill: item.skillName,
                          target: item.targetName
                        })}
                        className="h-9 rounded-lg border border-input bg-background px-2 text-sm font-normal text-foreground outline-none focus:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                        disabled={isExecuting}
                        value={resolution}
                        onChange={(event) =>
                          onConflictResolutionChange(
                            item.id,
                            event.currentTarget.value === "skip" ? "skip" : "overwrite"
                          )
                        }
                      >
                        {allowedResolutions.includes("overwrite") ? (
                          <option value="overwrite">
                            {t("skills.distribution.resolutions.overwrite")}
                          </option>
                        ) : null}
                        {allowedResolutions.includes("skip") ? (
                          <option value="skip">{t("skills.distribution.resolutions.skip")}</option>
                        ) : null}
                      </select>
                    </label>
                  ) : null}
                </div>
              );
            })}
          </div>

          <div className="mt-5 flex justify-end gap-2">
            <Button type="button" variant="outline" disabled={isExecuting} onClick={onClose}>
              {t("skills.actions.cancel")}
            </Button>
            <Button
              type="button"
              disabled={isExecuting}
              onClick={executionFinished && !hasRuntimeOverwriteSelection ? onClose : onConfirm}
            >
              {isExecuting ? (
                <>
                  <LoaderCircle aria-hidden="true" className="animate-spin" />
                  {t("skills.distribution.executingAction")}
                </>
              ) : executionFinished ? (
                t("skills.distribution.doneAction")
              ) : (
                t("skills.distribution.confirmAction")
              )}
            </Button>
          </div>
        </DialogPopup>
      </DialogPortal>
    </Dialog>
  );
};

const DistributionItemExecutionIcon = ({
  name,
  status
}: {
  name: string;
  status: SkillsPageState["distributionExecutionItemStatuses"][string];
}) => {
  const { t } = useTranslation();

  if (status.status === "loading") {
    return (
      <span
        role="status"
        aria-label={t("skills.distribution.itemDistributing", { name })}
        className="flex size-6 items-center justify-center rounded-md text-primary"
      >
        <LoaderCircle aria-hidden="true" className="size-3.5 animate-spin" />
      </span>
    );
  }

  const isErrorResult =
    status.result === "blocked" || status.result === "conflict" || status.result === "failed";
  const Icon = getDistributionResultIcon(status.result);
  const statusElement = (
    <span
      role="status"
      tabIndex={isErrorResult ? 0 : undefined}
      aria-label={t(`skills.distribution.itemResults.${status.result}`, { name })}
      className={cn(
        "flex size-6 items-center justify-center rounded-md text-muted-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
        (status.result === "installed" || status.result === "updated") && "text-primary",
        isErrorResult && "text-destructive"
      )}
    >
      <Icon aria-hidden="true" className="size-3.5" />
    </span>
  );

  if (!isErrorResult) {
    return statusElement;
  }

  return (
    <Tooltip>
      <TooltipTrigger render={statusElement} />
      <TooltipContent side="left" align="center" className="max-w-sm whitespace-normal leading-5">
        {toFriendlyDistributionErrorMessage(status.errorMessage, t)}
      </TooltipContent>
    </Tooltip>
  );
};

const canOverwriteRuntimeConflict = (
  status: SkillsPageState["distributionExecutionItemStatuses"][string] | undefined
): boolean => {
  return status?.status === "result" && status.result === "conflict";
};

const getDistributionResultIcon = (
  result: NonNullable<SkillsPageState["distributionExecutionItemStatuses"][string]["result"]>
) => {
  if (result === "installed" || result === "updated") {
    return CheckCircle2;
  }

  if (result === "skipped") {
    return CircleMinus;
  }

  return AlertCircle;
};

const toFriendlyDistributionErrorMessage = (
  errorMessage: string | null,
  t: ReturnType<typeof useTranslation>["t"]
): string => {
  const normalizedMessage = (errorMessage ?? "").toLowerCase();

  if (!normalizedMessage) {
    return t("skills.distribution.errors.generic");
  }

  if (
    normalizedMessage.includes("eperm") ||
    normalizedMessage.includes("eacces") ||
    normalizedMessage.includes("operation not permitted") ||
    normalizedMessage.includes("permission denied")
  ) {
    return t("skills.distribution.errors.permission");
  }

  if (
    normalizedMessage.includes("enoent") ||
    normalizedMessage.includes("no such file or directory") ||
    normalizedMessage.includes("source skill directory is missing")
  ) {
    return t("skills.distribution.errors.missingPath");
  }

  if (
    normalizedMessage.includes("enospc") ||
    normalizedMessage.includes("no space left on device")
  ) {
    return t("skills.distribution.errors.noSpace");
  }

  if (normalizedMessage.includes("source and target paths are required")) {
    return t("skills.distribution.errors.missingSourceOrTarget");
  }

  if (normalizedMessage.includes("target path cannot be the target root")) {
    return t("skills.distribution.errors.targetRoot");
  }

  if (normalizedMessage.includes("source and target paths cannot contain each other")) {
    return t("skills.distribution.errors.nestedPaths");
  }

  if (normalizedMessage.includes("duplicate target path")) {
    return t("skills.distribution.errors.duplicateTarget");
  }

  if (normalizedMessage.includes("target path already exists and is not owned by this skill")) {
    return t("skills.distribution.errors.unownedTarget");
  }

  return t("skills.distribution.errors.withMessage", { message: errorMessage });
};

const getDistributionActionBadgeVariant = (
  action: "blocked" | "install" | "update" | "skip" | "conflict"
): React.ComponentProps<typeof Badge>["variant"] => {
  if (action === "blocked" || action === "conflict") {
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
