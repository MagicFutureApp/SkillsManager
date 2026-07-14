import { Button } from "@/components/ui/button";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableEmptyRow,
  DataTableHead,
  DataTableHeader,
  DataTableRow
} from "@/components/data-table";
import { shouldIgnoreRowSelection } from "@/lib/row-selection";
import { providerLabels, type ProviderViewModel } from "./provider-data";
import { ProviderStatusPill } from "./provider-status-pill";
import React from "react";

type ProviderListProps = {
  actionLabel: (provider: ProviderViewModel) => string;
  authHeader: string;
  connectionHeader: string;
  emptyMessage: string;
  providerHeader: string;
  providers: ProviderViewModel[];
  selectedProviderId: string | null;
  statusHeader: string;
  onSelectProvider: (providerId: string) => void;
  onToggleConnection: (providerId: string) => void;
};

export const ProviderList = ({
  actionLabel,
  authHeader,
  connectionHeader,
  emptyMessage,
  providerHeader,
  providers,
  selectedProviderId,
  statusHeader,
  onSelectProvider,
  onToggleConnection
}: ProviderListProps) => {
  return (
    <DataTable aria-live="polite">
      <DataTableHeader className="max-[860px]:hidden">
        <DataTableRow>
          <DataTableHead>{providerHeader}</DataTableHead>
          <DataTableHead className="w-[128px]">{authHeader}</DataTableHead>
          <DataTableHead className="w-[96px]">{statusHeader}</DataTableHead>
          <DataTableHead className="w-[112px]">{connectionHeader}</DataTableHead>
        </DataTableRow>
      </DataTableHeader>

      <DataTableBody>
        {providers.length === 0 ? (
          <DataTableEmptyRow colSpan={4}>{emptyMessage}</DataTableEmptyRow>
        ) : (
          providers.map((provider) => (
            <DataTableRow
              key={provider.id}
              className="cursor-pointer"
              selected={provider.id === selectedProviderId}
              onClick={(event) => {
                if (shouldIgnoreRowSelection(event)) {
                  return;
                }

                onSelectProvider(provider.id);
              }}
            >
              <DataTableCell className="min-w-0">
                <Button
                  type="button"
                  variant="ghost"
                  className="grid h-auto min-w-0 justify-start gap-1 px-0 py-0 text-left font-normal hover:bg-transparent focus-visible:ring-3 focus-visible:ring-ring/50"
                  aria-label={provider.name}
                  aria-selected={provider.id === selectedProviderId}
                  onClick={() => onSelectProvider(provider.id)}
                >
                  <span className="truncate text-sm font-semibold">{provider.name}</span>
                  <span
                    className="truncate font-mono text-xs text-muted-foreground"
                    aria-hidden="true"
                  >
                    {providerLabels[provider.type]}
                  </span>
                </Button>
              </DataTableCell>
              <DataTableCell className="truncate font-mono text-xs text-muted-foreground">
                {provider.authMode}
              </DataTableCell>
              <DataTableCell>
                <ProviderStatusPill status={provider.status} />
              </DataTableCell>
              <DataTableCell>
                <Button
                  type="button"
                  size="sm"
                  variant={provider.connected ? "outline" : "default"}
                  className="w-max"
                  onClick={() => onToggleConnection(provider.id)}
                >
                  {actionLabel(provider)}
                </Button>
              </DataTableCell>
            </DataTableRow>
          ))
        )}
      </DataTableBody>
    </DataTable>
  );
};
