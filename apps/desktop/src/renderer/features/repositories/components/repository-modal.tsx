import { Form } from "@base-ui/react/form";
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
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { toErrorMessage } from "@/lib/errors";
import { Select, type SelectOption } from "@/components/ui/select";
import {
  visibleRepositoryProviderOptions,
  type RepositoryFormValues,
  type RepositoryProviderFilter,
  type RepositoryViewModel
} from "./repository-data";
import type { RepositorySourceInspection } from "@/global";
import { FolderOpen } from "lucide-react";
import React, { useEffect, useMemo, useRef, useState } from "react";

type RepositoryModalProps = {
  copy: {
    branch: string;
    browseLocalPath: string;
    cancel: string;
    close: string;
    editDescription: string;
    editTitle: string;
    name: string;
    newDescription: string;
    newTitle: string;
    note: string;
    patterns: string;
    patternsPlaceholder: string;
    provider: string;
    remoteUrl: string;
    requiredError: string;
    save: string;
    sourceInspectionError: string;
    sourceInspectionLoading: string;
  };
  editingRepository: RepositoryViewModel | null;
  error: string;
  isSaving: boolean;
  open: boolean;
  onClose: () => void;
  onSave: (values: RepositoryFormValues) => Promise<void>;
};

export const RepositoryModal = ({
  copy,
  editingRepository,
  error: saveError,
  isSaving,
  open,
  onClose,
  onSave
}: RepositoryModalProps) => {
  const initialValues = useMemo<RepositoryFormValues>(
    () => ({
      branch: editingRepository?.branch ?? "main",
      cachePath: editingRepository?.cachePath ?? "",
      name: editingRepository?.name ?? "",
      note: editingRepository?.note ?? "",
      patterns: formatDiscoveryPatterns(editingRepository?.patterns),
      provider: editingRepository?.provider ?? "GitHub",
      remoteUrl: editingRepository?.remoteUrl ?? ""
    }),
    [editingRepository]
  );
  const [values, setValues] = useState<RepositoryFormValues>(initialValues);
  const [error, setError] = useState("");
  const [sourceInspectionStatus, setSourceInspectionStatus] = useState<
    "idle" | "loading" | "error"
  >("idle");
  const [sourceInspectionErrorMessage, setSourceInspectionErrorMessage] = useState("");
  const touchedFieldsRef = useRef<Set<keyof RepositoryFormValues>>(new Set());

  useEffect(() => {
    setValues(initialValues);
    setError("");
    setSourceInspectionErrorMessage("");
    setSourceInspectionStatus("idle");
    touchedFieldsRef.current = new Set();
  }, [initialValues, open]);

  useEffect(() => {
    const remoteUrl = values.remoteUrl.trim();
    const inspectRepositorySource = window.skillsManager?.inspectRepositorySource;

    if (!open || editingRepository || !remoteUrl || !inspectRepositorySource) {
      return;
    }

    let isCurrent = true;

    setSourceInspectionStatus("loading");
    setSourceInspectionErrorMessage("");
    const inspectTimer = window.setTimeout(() => {
      void inspectRepositorySource(remoteUrl)
        .then((inspection) => {
          if (isCurrent) {
            applyInspection(inspection);
            setSourceInspectionErrorMessage("");
            setSourceInspectionStatus("idle");
          }
        })
        .catch((error: unknown) => {
          if (isCurrent) {
            setSourceInspectionErrorMessage(toErrorMessage(error));
            setSourceInspectionStatus("error");
          }
        });
    }, 250);

    return () => {
      isCurrent = false;
      window.clearTimeout(inspectTimer);
    };
  }, [editingRepository, open, values.remoteUrl]);

  if (!open) {
    return null;
  }

  const updateValue = (key: keyof RepositoryFormValues, value: string) => {
    touchedFieldsRef.current = new Set(touchedFieldsRef.current).add(key);
    setValues((currentValues) => ({ ...currentValues, [key]: value }));
  };

  const browseLocalPath = async () => {
    const selectedPath = await window.skillsManager?.selectLocalRepositoryPath?.();

    if (selectedPath) {
      updateValue("remoteUrl", selectedPath);
    }
  };

  const applyInspection = (inspection: RepositorySourceInspection) => {
    const touchedFields = touchedFieldsRef.current;
    const discoveredPatterns = formatDiscoveryPatterns(inspection.patterns);
    const isLocalSource = inspection.provider === "Local";

    setValues((currentValues) => ({
      ...currentValues,
      branch: !touchedFields.has("branch")
        ? isLocalSource
          ? ""
          : inspection.branch || currentValues.branch
        : currentValues.branch,
      name: inspection.name && !touchedFields.has("name") ? inspection.name : currentValues.name,
      note: !touchedFields.has("note")
        ? inspection.about || (isLocalSource ? "" : currentValues.note)
        : currentValues.note,
      provider:
        inspection.provider && !touchedFields.has("provider")
          ? inspection.provider
          : currentValues.provider,
      patterns:
        discoveredPatterns && !touchedFields.has("patterns")
          ? discoveredPatterns
          : currentValues.patterns
    }));
  };

  const sourceInspectionMessage =
    sourceInspectionStatus === "loading"
      ? copy.sourceInspectionLoading
      : sourceInspectionStatus === "error"
        ? sourceInspectionErrorMessage || copy.sourceInspectionError
        : "";

  const submitForm = () => {
    if (!values.name.trim() || !values.remoteUrl.trim()) {
      setError(copy.requiredError);
      return;
    }

    setError("");
    void onSave({
      ...values,
      branch: normalizeSubmittedBranch({
        branch: values.branch,
        isEditing: Boolean(editingRepository),
        provider: values.provider
      }),
      cachePath: values.cachePath.trim(),
      name: values.name.trim(),
      note: values.note.trim(),
      patterns: values.patterns.trim(),
      remoteUrl: values.remoteUrl.trim()
    });
  };

  const providerOptions: SelectOption<Exclude<RepositoryProviderFilter, "all">>[] =
    visibleRepositoryProviderOptions
      .filter((option) => option.value !== "all")
      .map((option) => ({
        value: option.value as Exclude<RepositoryProviderFilter, "all">,
        label: option.label
      }));

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogPortal>
        <DialogBackdrop />
        <DialogPopup>
          <Form onFormSubmit={submitForm}>
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <DialogTitle>{editingRepository ? copy.editTitle : copy.newTitle}</DialogTitle>
                <DialogDescription>
                  {editingRepository ? copy.editDescription : copy.newDescription}
                </DialogDescription>
              </div>
              <DialogClose
                render={<Button type="button" variant="outline" size="sm" disabled={isSaving} />}
              >
                {copy.close}
              </DialogClose>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <RepositoryField label={copy.remoteUrl} span>
                <div className="flex gap-2">
                  <Input
                    className="min-w-0 flex-1"
                    disabled={isSaving}
                    value={values.remoteUrl}
                    onValueChange={(value) => updateValue("remoteUrl", value)}
                  />
                  {!editingRepository ? (
                    <Button
                      type="button"
                      variant="outline"
                      className="h-10"
                      disabled={isSaving || !window.skillsManager?.selectLocalRepositoryPath}
                      onClick={() => void browseLocalPath()}
                    >
                      <FolderOpen data-icon="inline-start" />
                      {copy.browseLocalPath}
                    </Button>
                  ) : null}
                </div>
                {sourceInspectionMessage ? (
                  <FieldDescription>{sourceInspectionMessage}</FieldDescription>
                ) : null}
              </RepositoryField>
              <RepositoryField label={copy.name}>
                <Input
                  disabled={isSaving}
                  value={values.name}
                  onValueChange={(value) => updateValue("name", value)}
                />
              </RepositoryField>
              <RepositoryField label={copy.provider}>
                <Select
                  disabled={isSaving}
                  value={values.provider}
                  options={providerOptions}
                  onValueChange={(value) => updateValue("provider", value)}
                />
              </RepositoryField>
              <RepositoryField label={copy.branch}>
                <Input
                  disabled={isSaving}
                  value={values.branch}
                  onValueChange={(value) => updateValue("branch", value)}
                />
              </RepositoryField>
              <RepositoryField label={copy.patterns} span>
                <Input
                  disabled={isSaving}
                  placeholder={copy.patternsPlaceholder}
                  value={values.patterns}
                  onValueChange={(value) => updateValue("patterns", value)}
                />
              </RepositoryField>
              <RepositoryField label={copy.note} span>
                <Textarea
                  disabled={isSaving}
                  value={values.note}
                  onValueChange={(value) => updateValue("note", value)}
                />
              </RepositoryField>
            </div>

            {error || saveError ? (
              <p className="mt-3 text-sm text-destructive">{error || saveError}</p>
            ) : null}

            <div className="mt-4 flex justify-end gap-2">
              <DialogClose render={<Button type="button" variant="outline" disabled={isSaving} />}>
                {copy.cancel}
              </DialogClose>
              <Button type="submit" disabled={isSaving}>
                {copy.save}
              </Button>
            </div>
          </Form>
        </DialogPopup>
      </DialogPortal>
    </Dialog>
  );
};

const formatDiscoveryPatterns = (patterns: string[] | undefined): string => {
  return (
    patterns
      ?.map((pattern) => pattern.trim())
      .filter(Boolean)
      .join(", ") ?? ""
  );
};

const normalizeSubmittedBranch = ({
  branch,
  isEditing,
  provider
}: {
  branch: string;
  isEditing: boolean;
  provider: RepositoryFormValues["provider"];
}): string => {
  const trimmedBranch = branch.trim();

  if (isEditing || provider === "Local") {
    return trimmedBranch;
  }

  return trimmedBranch || "main";
};

const RepositoryField = ({
  children,
  label,
  span
}: React.PropsWithChildren<{ label: string; span?: boolean }>) => {
  return (
    <Field className={span ? "col-span-2" : undefined}>
      <FieldLabel>{label}</FieldLabel>
      {children}
    </Field>
  );
};
