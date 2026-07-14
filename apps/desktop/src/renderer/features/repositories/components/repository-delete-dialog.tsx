import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBackdrop,
  DialogClose,
  DialogDescription,
  DialogPopup,
  DialogPortal,
  DialogTitle
} from "@/components/ui/dialog";
import type { RepositoryDeletePreview } from "@/global";
import React from "react";

type RepositoryDeleteDialogProps = {
  copy: {
    cachePath: string;
    cancel: string;
    confirm: string;
    description: string;
    emptySkills: string;
    loading: string;
    skillsHeading: string;
    title: string;
  };
  error: string;
  isDeleting: boolean;
  isLoading: boolean;
  open: boolean;
  preview: RepositoryDeletePreview | null;
  onClose: () => void;
  onConfirm: () => void;
};

export const RepositoryDeleteDialog = ({
  copy,
  error,
  isDeleting,
  isLoading,
  open,
  preview,
  onClose,
  onConfirm
}: RepositoryDeleteDialogProps) => {
  if (!open) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogPortal>
        <DialogBackdrop />
        <DialogPopup>
          <DialogTitle>{copy.title}</DialogTitle>
          <DialogDescription>{copy.description}</DialogDescription>

          {isLoading ? <p className="mt-4 text-sm text-muted-foreground">{copy.loading}</p> : null}

          {preview ? (
            <div className="mt-4 grid gap-4">
              <div className="rounded-lg border border-border bg-muted/40 p-3">
                <span className="text-xs font-semibold text-muted-foreground">
                  {copy.cachePath}
                </span>
                <p className="mt-1 break-words font-mono text-sm">{preview.localCachePath}</p>
              </div>

              <div>
                <h3 className="text-sm font-semibold">{copy.skillsHeading}</h3>
                {preview.skills.length ? (
                  <ul className="mt-2 max-h-56 overflow-auto rounded-lg border border-border">
                    {preview.skills.map((skill) => (
                      <li
                        key={skill.id}
                        className="border-b border-border px-3 py-2 last:border-b-0"
                      >
                        <span className="block text-sm font-medium">{skill.name}</span>
                        <span className="mt-1 block break-words font-mono text-xs text-muted-foreground">
                          {skill.entryPath}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 rounded-lg border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
                    {copy.emptySkills}
                  </p>
                )}
              </div>
            </div>
          ) : null}

          {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}

          <div className="mt-5 flex justify-end gap-2">
            <DialogClose
              render={<Button type="button" variant="outline" disabled={isDeleting || isLoading} />}
            >
              {copy.cancel}
            </DialogClose>
            <Button
              type="button"
              variant="destructive"
              disabled={!preview || isDeleting || isLoading}
              onClick={onConfirm}
            >
              {copy.confirm}
            </Button>
          </div>
        </DialogPopup>
      </DialogPortal>
    </Dialog>
  );
};
