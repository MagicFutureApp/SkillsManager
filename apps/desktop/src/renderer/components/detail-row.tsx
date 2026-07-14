import { ExternalLink } from "lucide-react";
import React from "react";

type DetailRowProps = {
  breakMode?: "words" | "all";
  label: string;
  mono?: boolean;
  openLabel?: string;
  value: string;
  onOpen?: () => void;
};

export const DetailRow = ({
  breakMode = "words",
  label,
  mono,
  openLabel,
  value,
  onOpen
}: DetailRowProps) => {
  const valueClassName = [
    breakMode === "all" ? "break-all" : "break-words",
    mono ? "font-mono" : "",
    "text-sm"
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="rounded-lg border border-border bg-muted/40 p-2">
      <span className="text-xs font-semibold text-muted-foreground">{label}</span>
      {onOpen ? (
        <button
          type="button"
          className="mt-1 flex w-full items-start justify-between gap-2 rounded-md text-left text-primary underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
          aria-label={openLabel}
          onClick={onOpen}
        >
          <span className={valueClassName}>{value}</span>
          <ExternalLink className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        </button>
      ) : (
        <p className={`mt-1 ${valueClassName}`}>{value}</p>
      )}
    </div>
  );
};
