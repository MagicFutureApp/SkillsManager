import type { KvNamespace } from "../worker-env";

export class MemoryKv implements KvNamespace {
  readonly values = new Map<string, string>();
  readonly deletedKeys: string[] = [];
  readonly operations: string[] = [];

  async get(key: string): Promise<string | null> {
    return this.values.get(key) ?? null;
  }

  async put(key: string, value: string): Promise<void> {
    this.operations.push(`put:${key}`);
    this.values.set(key, value);
  }

  async delete(key: string): Promise<void> {
    this.operations.push(`delete:${key}`);
    this.deletedKeys.push(key);
    this.values.delete(key);
  }
}
