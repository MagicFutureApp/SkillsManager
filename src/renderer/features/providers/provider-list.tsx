import { Button } from "@/components/ui/button";
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
    <section className="overflow-hidden rounded-xl border border-border bg-card" aria-live="polite">
      <div className="grid grid-cols-[minmax(220px,1fr)_128px_96px_112px] items-center gap-3 border-b border-border px-4 py-3 text-xs font-semibold text-muted-foreground max-[860px]:hidden">
        <span>{providerHeader}</span>
        <span>{authHeader}</span>
        <span>{statusHeader}</span>
        <span>{connectionHeader}</span>
      </div>
      {providers.length === 0 ? (
        <div className="px-4 py-8 text-center text-sm text-muted-foreground">{emptyMessage}</div>
      ) : (
        providers.map((provider) => (
          <div
            key={provider.id}
            className="grid grid-cols-[minmax(220px,1fr)_128px_96px_112px] items-center gap-3 border-b border-border px-4 py-3 last:border-b-0 data-[selected=true]:bg-primary/5 max-[860px]:grid-cols-1"
            data-selected={provider.id === selectedProviderId}
          >
            <button
              type="button"
              className="grid min-w-0 gap-1 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              aria-label={provider.name}
              aria-selected={provider.id === selectedProviderId}
              onClick={() => onSelectProvider(provider.id)}
            >
              <span className="truncate text-sm font-semibold">{provider.name}</span>
              <span className="truncate font-mono text-xs text-muted-foreground" aria-hidden="true">
                {providerLabels[provider.type]}
              </span>
            </button>
            <span className="truncate font-mono text-xs text-muted-foreground">
              {provider.authMode}
            </span>
            <ProviderStatusPill status={provider.status} />
            <Button
              type="button"
              size="sm"
              variant={provider.connected ? "outline" : "default"}
              className="w-max"
              onClick={() => onToggleConnection(provider.id)}
            >
              {actionLabel(provider)}
            </Button>
          </div>
        ))
      )}
    </section>
  );
};
