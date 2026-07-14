import { asc } from "drizzle-orm";

import type { ProviderApiRecord, ProviderType } from "../../core/providers/provider-api";
import type { createDbClient } from "../client";
import { providers } from "../schema";

type DbClient = ReturnType<typeof createDbClient>;

export const createProviderRepository = (db: DbClient) => {
  return {
    async list(): Promise<ProviderApiRecord[]> {
      const rows = await db.select().from(providers).orderBy(asc(providers.name));

      return rows.map((row) => ({
        configJson: row.configJson,
        createdAt: toIsoString(row.createdAt),
        id: row.id,
        name: row.name,
        type: normalizeProviderType(row.type),
        updatedAt: toIsoString(row.updatedAt)
      }));
    }
  };
};

const toIsoString = (value: Date): string => {
  return value.toISOString();
};

const normalizeProviderType = (value: string): ProviderType => {
  if (
    value === "github" ||
    value === "gitlab" ||
    value === "gitea" ||
    value === "bitbucket" ||
    value === "local_git" ||
    value === "skills_sh"
  ) {
    return value;
  }

  return "local_git";
};
