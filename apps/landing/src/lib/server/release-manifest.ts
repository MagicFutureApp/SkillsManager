import { createServerFn } from "@tanstack/react-start";

import {
  isReleaseManifest,
  SKILLS_MANAGER_RELEASE_MANIFEST_KEY,
  type ReleaseManifest
} from "@/lib/release-manifest.ts";

/**
 * 服务端读取最新发布清单。
 *
 * 仅在 Cloudflare Workers 运行时执行，访问 SKILLS_MANAGER_RELEASE_MANIFEST KV 绑定。
 * 发新版本后更新 KV 中的清单即可，无需重新部署就能在 SSR 输出里反映最新版本。
 * 返回 null 表示清单暂不可用（KV 未写入或形状校验失败）。
 */
export const getReleaseManifest = createServerFn({ method: "GET" }).handler(
  async (): Promise<ReleaseManifest | null> => {
    try {
      const env = (await import("cloudflare:workers")).env;
      const manifest = await env.SKILLS_MANAGER_RELEASE_MANIFEST.get(
        SKILLS_MANAGER_RELEASE_MANIFEST_KEY,
        "json"
      );

      return isReleaseManifest(manifest) ? manifest : null;
    } catch (error) {
      console.error("Failed to read release manifest from KV", error);
      return null;
    }
  }
);
