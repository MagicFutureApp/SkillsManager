import { Button } from "@/components/ui/button";
import { providerLabels, type ProviderViewModel } from "./provider-data";
import { ProviderStatusPill } from "./provider-status-pill";
import React from "react";

type ProviderDetailProps = {
  connectLabel: string;
  connectionConfigHeading: string;
  copy: {
    authMode: string;
    connection: string;
    connected: string;
    defaultEmptyDescription: string;
    defaultEmptyTitle: string;
    discoveryStrategy: string;
    enabled: string;
    notConnected: string;
    provider: string;
    status: string;
  };
  defaultRulesHeading: string;
  diagnosticHeading: string;
  disconnectLabel: string;
  provider: ProviderViewModel | null;
  testLabel: string;
  onConnect: () => void;
  onDisconnect: () => void;
  onTest: () => void;
};

export const ProviderDetail = ({
  connectLabel,
  connectionConfigHeading,
  copy,
  defaultRulesHeading,
  diagnosticHeading,
  disconnectLabel,
  provider,
  testLabel,
  onConnect,
  onDisconnect,
  onTest
}: ProviderDetailProps) => {
  return (
    <aside
      className="grid content-start gap-3 border-l border-border bg-card px-5 py-6 max-[1180px]:border-l-0 max-[1180px]:border-t max-[860px]:hidden"
      aria-label="Provider 详情"
    >
      <section className="rounded-xl border border-border bg-card p-4">
        <h2 className="text-xl font-semibold">
          {provider ? provider.name : copy.defaultEmptyTitle}
        </h2>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          {provider ? provider.notes : copy.defaultEmptyDescription}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button type="button" disabled={!provider || provider.connected} onClick={onConnect}>
            {connectLabel}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={!provider || !provider.connected}
            onClick={onDisconnect}
          >
            {disconnectLabel}
          </Button>
          <Button type="button" variant="outline" disabled={!provider} onClick={onTest}>
            {testLabel}
          </Button>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-4">
        <h3 className="font-semibold">{connectionConfigHeading}</h3>
        {provider ? (
          <div className="mt-3 grid gap-2">
            <DetailRow label={copy.provider} value={providerLabels[provider.type]} mono />
            <DetailRow label={copy.authMode} value={provider.authMode} />
            <div className="rounded-lg border border-border bg-muted/40 p-2">
              <span className="text-xs font-semibold text-muted-foreground">{copy.status}</span>
              <p className="mt-1">
                <ProviderStatusPill status={provider.status} />
              </p>
            </div>
            <DetailRow
              label={copy.connection}
              value={provider.connected ? copy.connected : copy.notConnected}
            />
            <DetailRow label={copy.enabled} value={provider.enabled ? "true" : "false"} mono />
            <DetailRow label={copy.discoveryStrategy} value={provider.discoveryStrategy} />
          </div>
        ) : null}
      </section>

      <section className="rounded-xl border border-border bg-card p-4">
        <h3 className="font-semibold">{defaultRulesHeading}</h3>
        <div className="mt-3 grid gap-2">
          {provider?.discoveryPatterns.map((rule, index) => (
            <div
              key={rule}
              className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-lg border border-border bg-background p-3"
            >
              <strong className="truncate font-mono text-xs">{rule}</strong>
              <span className="text-xs text-muted-foreground">
                {index === 0 ? "primary" : "fallback"}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-4">
        <h3 className="font-semibold">{diagnosticHeading}</h3>
        <pre className="mt-3 whitespace-pre-wrap rounded-lg border border-border bg-muted/40 p-3 font-mono text-xs leading-5 text-muted-foreground">
          {provider?.diagnostic ?? "尚未选择 Provider。"}
        </pre>
      </section>
    </aside>
  );
};

const DetailRow = ({ label, mono, value }: { label: string; mono?: boolean; value: string }) => {
  return (
    <div className="rounded-lg border border-border bg-muted/40 p-2">
      <span className="text-xs font-semibold text-muted-foreground">{label}</span>
      <p className={mono ? "mt-1 break-words font-mono text-sm" : "mt-1 break-words text-sm"}>
        {value}
      </p>
    </div>
  );
};
