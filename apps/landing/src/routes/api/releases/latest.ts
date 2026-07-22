import { createFileRoute } from "@tanstack/react-router";
import { env } from "cloudflare:workers";

import {
  isReleaseManifest,
  SKILLS_MANAGER_RELEASE_MANIFEST_KEY
} from "@/lib/release-manifest.ts";

export const Route = createFileRoute("/api/releases/latest")({
  server: {
    handlers: {
      GET: async () => {
        const manifest = await env.SKILLS_MANAGER_RELEASE_MANIFEST.get(
          SKILLS_MANAGER_RELEASE_MANIFEST_KEY,
          "json"
        );

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
