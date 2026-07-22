interface KVNamespace {
  get(key: string, type: "json"): Promise<unknown>;
}

declare module "cloudflare:workers" {
  export const env: Env;
}
