import { createFileRoute } from "@tanstack/react-router";
import { env } from "cloudflare:workers";

import { isReleaseManifest, RELEASE_MANIFEST_KEY } from "../../../lib/release-manifest";

export const Route = createFileRoute("/api/releases/latest")({
  server: {
    handlers: {
      GET: async () => {
        const manifest = await env.RELEASE_MANIFEST.get(RELEASE_MANIFEST_KEY, "json");

        if (!isReleaseManifest(manifest)) {
          return Response.json(
            { error: "Release manifest is not available" },
            {
              status: 404,
              headers: { "Cache-Control": "no-store" }
            }
          );
        }

        return Response.json(manifest, {
          headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=3600" }
        });
      }
    }
  }
});
