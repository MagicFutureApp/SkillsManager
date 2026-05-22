import { eq } from "drizzle-orm";
import { appSettings } from "../schema";
import type { createDbClient } from "../client";

type DbClient = ReturnType<typeof createDbClient>;

export const createAppSettingsRepository = (db: DbClient) => {
  return {
    async get(key: string) {
      return db.query.appSettings.findFirst({
        where: eq(appSettings.key, key)
      });
    }
  };
};
