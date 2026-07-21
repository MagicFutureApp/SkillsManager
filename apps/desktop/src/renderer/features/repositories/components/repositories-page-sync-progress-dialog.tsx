import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogDescription,
  DialogPopup,
  DialogPortal,
  DialogTitle
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { LoaderCircle } from "lucide-react";
import React from "react";
import { useTranslation } from "react-i18next";

import { useRepositoriesPageContext } from "./repositories-page-context";

export const RepositoriesPageSyncProgressDialog = () => {
  const { t } = useTranslation();
  const page = useRepositoriesPageContext();
  const progress = page.syncProgressDialog;

  if (!progress) {
    return null;
  }

  const isSyncing = progress.status === "syncing";
  const description =
    progress.status === "completed"
      ? t("repositories.syncProgress.completedDescription")
      : progress.status === "failed"
        ? t("repositories.syncProgress.failedDescription")
        : t("repositories.syncProgress.syncingDescription");

  return (
    <Dialog open={Boolean(progress)} modal={false}>
      <DialogPortal>
        <DialogPopup className="max-w-[520px]">
          <div className="flex items-start gap-3">
            <div
              role="status"
              aria-label={t("repositories.syncProgress.title")}
              className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full border border-border bg-muted"
            >
              <LoaderCircle
                aria-hidden="true"
                className={cn("size-5 text-muted-foreground", isSyncing && "animate-spin")}
              />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-lg">{t("repositories.syncProgress.title")}</DialogTitle>
              <DialogDescription>{description}</DialogDescription>
            </div>
          </div>

          <div className="mt-4 max-h-72 overflow-auto rounded-lg border border-border">
            {progress.repositories.map((repository) => (
              <section
                key={repository.repositoryId}
                className="border-b border-border last:border-b-0"
              >
                <h3 className="truncate bg-muted/40 px-3 py-2 text-xs font-semibold text-muted-foreground">
                  {repository.repositoryName}
                </h3>
                {repository.items.length ? (
                  <ul>
                    {repository.items.map((item) => {
                      const itemIsSyncing = item.status === "syncing";
                      const itemAriaLabel =
                        item.status === "completed"
                          ? t("repositories.syncProgress.completedItem", { name: item.name })
                          : item.status === "failed"
                            ? t("repositories.syncProgress.failedItem", { name: item.name })
                            : t("repositories.syncProgress.syncingItem", { name: item.name });

                      return (
                        <li
                          key={item.id}
                          className="flex min-h-10 items-center justify-between gap-3 px-3 py-2"
                        >
                          <span className="min-w-0 truncate text-sm">{item.name}</span>
                          <span
                            role="status"
                            aria-label={itemAriaLabel}
                            className={cn(
                              "flex size-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground",
                              item.status === "failed" && "text-destructive",
                              itemIsSyncing && "text-primary"
                            )}
                          >
                            <LoaderCircle
                              aria-hidden="true"
                              className={cn("size-4", itemIsSyncing && "animate-spin")}
                            />
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="px-3 py-3 text-sm text-muted-foreground">
                    {t("repositories.syncProgress.empty")}
                  </p>
                )}
              </section>
            ))}
          </div>

          {progress.status === "failed" ? (
            <div className="mt-4 flex justify-end">
              <Button type="button" variant="outline" onClick={page.closeSyncProgressDialog}>
                {t("repositories.syncProgress.close")}
              </Button>
            </div>
          ) : null}
        </DialogPopup>
      </DialogPortal>
    </Dialog>
  );
};
