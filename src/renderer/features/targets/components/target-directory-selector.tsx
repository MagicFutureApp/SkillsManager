import { FolderOpen } from "lucide-react";
import React from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

import type { TargetsPageState } from "../hooks/use-targets-page-state";

type PendingTargetAgentDirectory = TargetsPageState["pendingTargetAgentDirectory"];
type TargetDirectoryAgentOption = NonNullable<PendingTargetAgentDirectory>["options"][number];

type TargetDirectorySelectorProps = {
  customAgentDirectoryName: string;
  disabled: boolean;
  isCustomAgentDirectorySelected: boolean;
  onBrowse?: () => void;
  onCustomAgentDirectoryNameChange: (directoryName: string) => void;
  onSelectAgentDirectoryOption: (option: TargetDirectoryAgentOption) => void;
  onSelectCustomAgentDirectoryOption: () => void;
  path: string;
  pathLabel: string;
  pendingDirectory: PendingTargetAgentDirectory;
  selectedAgentType: string | null;
  showBrowse?: boolean;
};

export const TargetDirectorySelector = ({
  customAgentDirectoryName,
  disabled,
  isCustomAgentDirectorySelected,
  onBrowse,
  onCustomAgentDirectoryNameChange,
  onSelectAgentDirectoryOption,
  onSelectCustomAgentDirectoryOption,
  path,
  pathLabel,
  pendingDirectory,
  selectedAgentType,
  showBrowse = true
}: TargetDirectorySelectorProps) => {
  const { t } = useTranslation();

  return (
    <>
      <Field>
        <FieldLabel>{pathLabel}</FieldLabel>
        <div className="flex gap-2">
          <Input
            readOnly
            className={showBrowse ? "min-w-0 flex-1" : undefined}
            disabled={disabled}
            value={path}
          />
          {showBrowse ? (
            <Button
              type="button"
              variant="outline"
              className="h-10"
              disabled={disabled || !window.skillsManager?.selectTargetDirectory}
              onClick={onBrowse}
            >
              <FolderOpen data-icon="inline-start" />
              {t("targets.modal.browse")}
            </Button>
          ) : null}
        </div>
      </Field>

      {pendingDirectory ? (
        <Field>
          <FieldLabel>{t("targets.modal.agentType")}</FieldLabel>
          <FieldDescription>{t("targets.modal.agentTypeDescription")}</FieldDescription>
          <div className="rounded-lg border border-border bg-muted/30 p-3">
            <div className="min-w-0">
              <p className="text-[11px] font-medium text-muted-foreground">
                {t("targets.modal.selectedDirectory")}
              </p>
              <p className="mt-1 break-all text-xs font-normal text-foreground">
                {pendingDirectory.basePath}
              </p>
            </div>
            <div
              role="radiogroup"
              aria-label={t("targets.modal.agentType")}
              className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4"
            >
              {pendingDirectory.options.map((option) => {
                const isSelected = selectedAgentType === option.type;

                return (
                  <Button
                    key={option.type}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    variant={isSelected ? "secondary" : "outline"}
                    className="h-8 min-w-0 px-2"
                    disabled={disabled}
                    onClick={() => onSelectAgentDirectoryOption(option)}
                  >
                    <span className="truncate">{option.name}</span>
                  </Button>
                );
              })}
              <Button
                type="button"
                role="radio"
                aria-checked={isCustomAgentDirectorySelected}
                variant={isCustomAgentDirectorySelected ? "secondary" : "outline"}
                className="h-8 min-w-0 px-2"
                disabled={disabled}
                onClick={onSelectCustomAgentDirectoryOption}
              >
                <span className="truncate">{t("targets.modal.customAgentType")}</span>
              </Button>
            </div>
            {isCustomAgentDirectorySelected ? (
              <Field className="mt-3">
                <FieldLabel>{t("targets.modal.customAgentFolder")}</FieldLabel>
                <Input
                  disabled={disabled}
                  placeholder={t("targets.modal.customAgentFolderPlaceholder")}
                  value={customAgentDirectoryName}
                  onValueChange={onCustomAgentDirectoryNameChange}
                />
              </Field>
            ) : null}
          </div>
        </Field>
      ) : null}
    </>
  );
};
