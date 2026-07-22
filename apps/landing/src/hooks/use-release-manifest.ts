import { useEffect, useState } from "react";

import { isReleaseManifest, type ReleaseManifest } from "../lib/release-manifest";

export interface ReleaseManifestState {
  manifest: ReleaseManifest | null;
  loading: boolean;
}

export function useReleaseManifest(): ReleaseManifestState {
  const [state, setState] = useState<ReleaseManifestState>({ manifest: null, loading: true });

  useEffect(() => {
    const controller = new AbortController();

    fetch("/api/releases/latest", {
      headers: { Accept: "application/json" },
      signal: controller.signal
    })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Release manifest request failed: ${response.status}`);
        const value: unknown = await response.json();
        if (!isReleaseManifest(value)) throw new Error("Release manifest has an invalid shape");
        return value;
      })
      .then((manifest) => setState({ manifest, loading: false }))
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setState({ manifest: null, loading: false });
      });

    return () => controller.abort();
  }, []);

  return state;
}
