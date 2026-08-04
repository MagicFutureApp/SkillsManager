import { getRouteApi } from "@tanstack/react-router";

import type { ReleaseManifest } from "@/lib/release-manifest.ts";

const rootRouteApi = getRouteApi("__root__");

export interface ReleaseManifestState {
  manifest: ReleaseManifest | null;
  loading: boolean;
}

/**
 * 读取 SSR 注入的最新发布清单。
 *
 * 数据由 root route 的 loader 在服务端读取并序列化进 HTML，
 * 首屏无需客户端二次请求，也不会出现加载闪动。
 * 发新版本并更新 KV 后，下一次 SSR 即可反映最新版本。
 */
export function useReleaseManifest(): ReleaseManifestState {
  const { releaseManifest } = rootRouteApi.useLoaderData();
  return { manifest: releaseManifest, loading: false };
}
