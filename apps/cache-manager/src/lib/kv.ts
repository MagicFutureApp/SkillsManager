import { BEST_100_KV_KEY, createDefaultMeta, type Best100Meta, type Best100Store } from "./source";

export type KvEnv = {
  SkillsCacheManager: KVNamespace;
};

export const readStore = async (env: KvEnv): Promise<Best100Store | null> => {
  const raw = await env.SkillsCacheManager.get(BEST_100_KV_KEY);

  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Best100Store;

    if (typeof parsed.csv !== "string" || typeof parsed.meta !== "object" || parsed.meta === null) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
};

export const readMeta = async (env: KvEnv, source: string): Promise<Best100Meta> => {
  return (await readStore(env))?.meta ?? createDefaultMeta(source);
};

export const writeStore = async (env: KvEnv, store: Best100Store): Promise<void> => {
  await env.SkillsCacheManager.put(BEST_100_KV_KEY, JSON.stringify(store));
};
