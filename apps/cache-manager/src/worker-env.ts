export interface KvNamespace {
  get(key: string): Promise<string | null>;
  put(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
}

export type WorkerBindings = {
  SKILLS_SH_CACHE: KvNamespace;
  SKILLS_SH_TOKEN_URL: string;
  SKILLS_SH_TOKEN_SECRET: string;
  CACHE_ADMIN_TOKEN: string;
};

export type CacheManagerEnv = {
  Bindings: WorkerBindings;
};

export type WorkerExecutionContext = {
  passThroughOnException(): void;
  props: Record<string, unknown>;
  waitUntil(promise: Promise<unknown>): void;
};
