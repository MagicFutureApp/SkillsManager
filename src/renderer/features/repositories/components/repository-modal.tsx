import { Button } from "@/components/ui/button";
import {
  repositoryProviderOptions,
  type RepositoryFormValues,
  type RepositoryProviderFilter,
  type RepositoryViewModel
} from "./repository-data";
import type { RepositorySourceInspection } from "@/global";
import React, { useEffect, useMemo, useState } from "react";

type RepositoryModalProps = {
  copy: {
    branch: string;
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
  open: boolean;
  onClose: () => void;
  onSave: (values: RepositoryFormValues) => void;
};

export const RepositoryModal = ({
  copy,
  editingRepository,
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
      patterns: editingRepository?.patterns.join(", ") ?? "",
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
  const [touchedFields, setTouchedFields] = useState<Set<keyof RepositoryFormValues>>(
    () => new Set()
  );

  useEffect(() => {
    setValues(initialValues);
    setError("");
    setSourceInspectionStatus("idle");
    setTouchedFields(new Set());
  }, [initialValues, open]);

  useEffect(() => {
    const remoteUrl = values.remoteUrl.trim();
    const inspectRepositorySource = window.skillsManager?.inspectRepositorySource;

    if (!open || editingRepository || !remoteUrl || !inspectRepositorySource) {
      return;
    }

    let isCurrent = true;

    setSourceInspectionStatus("loading");
    const inspectTimer = window.setTimeout(() => {
      void inspectRepositorySource(remoteUrl)
        .then((inspection) => {
          if (isCurrent) {
            applyInspection(inspection);
            setSourceInspectionStatus("idle");
          }
        })
        .catch(() => {
          if (isCurrent) {
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
    setTouchedFields((currentFields) => new Set(currentFields).add(key));
    setValues((currentValues) => ({ ...currentValues, [key]: value }));
  };

  const applyInspection = (inspection: RepositorySourceInspection) => {
    setValues((currentValues) => ({
      ...currentValues,
      branch:
        inspection.branch && !touchedFields.has("branch")
          ? inspection.branch
          : currentValues.branch,
      name: inspection.name && !touchedFields.has("name") ? inspection.name : currentValues.name,
      note: inspection.about && !touchedFields.has("note") ? inspection.about : currentValues.note,
      provider:
        inspection.provider && !touchedFields.has("provider")
          ? inspection.provider
          : currentValues.provider
    }));
  };

  const sourceInspectionMessage =
    sourceInspectionStatus === "loading"
      ? copy.sourceInspectionLoading
      : sourceInspectionStatus === "error"
        ? copy.sourceInspectionError
        : "";

  const submitForm = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!values.name.trim() || !values.remoteUrl.trim()) {
      setError(copy.requiredError);
      return;
    }

    onSave({
      ...values,
      branch: values.branch.trim() || "main",
      cachePath: values.cachePath.trim(),
      name: values.name.trim(),
      note: values.note.trim(),
      patterns: values.patterns.trim(),
      remoteUrl: values.remoteUrl.trim()
    });
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/30 p-6">
      <form
        className="max-h-[calc(100vh-48px)] w-full max-w-[680px] overflow-auto rounded-xl border border-border bg-card p-5 shadow-lg"
        role="dialog"
        aria-modal="true"
        aria-labelledby="repository-modal-title"
        onSubmit={submitForm}
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 id="repository-modal-title" className="text-2xl font-semibold">
              {editingRepository ? copy.editTitle : copy.newTitle}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {editingRepository ? copy.editDescription : copy.newDescription}
            </p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            {copy.close}
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label={copy.remoteUrl} span>
            <input
              className={controlClassName}
              value={values.remoteUrl}
              onChange={(event) => updateValue("remoteUrl", event.target.value)}
            />
            {sourceInspectionMessage ? (
              <span className="text-xs font-normal text-muted-foreground">
                {sourceInspectionMessage}
              </span>
            ) : null}
          </Field>
          <Field label={copy.name}>
            <input
              className={controlClassName}
              value={values.name}
              onChange={(event) => updateValue("name", event.target.value)}
            />
          </Field>
          <Field label={copy.provider}>
            <select
              className={controlClassName}
              value={values.provider}
              onChange={(event) =>
                updateValue(
                  "provider",
                  event.target.value as Exclude<RepositoryProviderFilter, "all">
                )
              }
            >
              {repositoryProviderOptions
                .filter((option) => option.value !== "all")
                .map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
            </select>
          </Field>
          <Field label={copy.branch}>
            <input
              className={controlClassName}
              value={values.branch}
              onChange={(event) => updateValue("branch", event.target.value)}
            />
          </Field>
          <Field label={copy.patterns} span>
            <input
              className={controlClassName}
              placeholder={copy.patternsPlaceholder}
              value={values.patterns}
              onChange={(event) => updateValue("patterns", event.target.value)}
            />
          </Field>
          <Field label={copy.note} span>
            <textarea
              className="min-h-22 rounded-lg border border-input bg-background px-3 py-2 text-sm font-normal text-foreground outline-none focus:border-ring"
              value={values.note}
              onChange={(event) => updateValue("note", event.target.value)}
            />
          </Field>
        </div>

        {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}

        <div className="mt-4 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            {copy.cancel}
          </Button>
          <Button type="submit">{copy.save}</Button>
        </div>
      </form>
    </div>
  );
};

const controlClassName =
  "h-10 w-full rounded-lg border border-input bg-background px-3 text-sm font-normal text-foreground outline-none focus:border-ring";

const Field = ({
  children,
  label,
  span
}: React.PropsWithChildren<{ label: string; span?: boolean }>) => {
  return (
    <label
      className={
        span
          ? "col-span-2 grid gap-1.5 text-xs font-semibold text-muted-foreground"
          : "grid gap-1.5 text-xs font-semibold text-muted-foreground"
      }
    >
      {label}
      {children}
    </label>
  );
};
