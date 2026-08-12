import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBackdrop, DialogClose, DialogDescription, DialogPopup, DialogPortal, DialogTitle } from "@/components/ui/dialog";
import type { CatalogSkill } from "@/global";
import { Download, ExternalLink } from "lucide-react";
import React from "react";
import { useTranslation } from "react-i18next";
import { sourceTypeLabel } from "../discover-utils";

type SkillDetailDialogProps = {
  skill: CatalogSkill | null;
  onClose: () => void;
  onOpenExternal: (url: string) => void;
};

export const SkillDetailDialog = ({ skill, onClose, onOpenExternal }: SkillDetailDialogProps) => {
  const { t } = useTranslation();

  if (!skill) {
    return null;
  }

  return (
    <Dialog open onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogPortal>
        <DialogBackdrop />
        {/* Only five fields, so the 680px default popup is far too wide. */}
        <DialogPopup className="max-w-md">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <DialogTitle className="truncate text-lg">{skill.name}</DialogTitle>
              <DialogDescription className="truncate font-mono text-xs" title={skill.source}>
                {skill.source}
              </DialogDescription>
            </div>
            <Badge variant="outline" className="mt-1 shrink-0 font-normal">
              {sourceTypeLabel(t, skill.sourceType)}
            </Badge>
          </div>

          <dl className="grid grid-cols-[5rem_minmax(0,1fr)] gap-x-3 gap-y-2 border-t border-border pt-4 text-sm">
            <dt className="text-muted-foreground">{t("discover.detail.installs")}</dt>
            <dd className="tabular-nums">{skill.installs.toLocaleString()}</dd>
            {/* `url` is typed non-null but upstream may still send an empty string. */}
            {skill.url ? (
              <>
                <dt className="text-muted-foreground">{t("discover.detail.url")}</dt>
                <dd className="min-w-0 truncate font-mono text-xs" title={skill.url}>
                  {skill.url}
                </dd>
              </>
            ) : null}
          </dl>

          {/* Always-visible explanation: a disabled button cannot host a tooltip
              (base button sets `disabled:pointer-events-none`). */}
          <p className="mt-4 text-xs leading-5 text-muted-foreground">{t("discover.detail.installHint")}</p>

          <div className="mt-4 flex items-center justify-end gap-2">
            <DialogClose render={<Button type="button" variant="outline" />}>{t("discover.detail.close")}</DialogClose>
            {skill.url ? (
              <Button type="button" variant="outline" onClick={() => onOpenExternal(skill.url)}>
                <ExternalLink data-icon="inline-start" />
                {t("discover.detail.openExternal")}
              </Button>
            ) : null}
            <Button type="button" disabled aria-disabled="true">
              <Download data-icon="inline-start" />
              {t("discover.detail.install")}
              <Badge variant="secondary" className="ml-1 h-4 px-1.5 text-[10px] font-normal">
                {t("discover.detail.installComingSoon")}
              </Badge>
            </Button>
          </div>
        </DialogPopup>
      </DialogPortal>
    </Dialog>
  );
};
