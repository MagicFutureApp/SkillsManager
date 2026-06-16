import { eq } from "drizzle-orm";
import { appSettings } from "../schema";
import type { createDbClient } from "../client";

type DbClient = ReturnType<typeof createDbClient>;

export const createAppSettingsRepository = (db: DbClient) => {
  return {
    async delete(key: string) {
      await db.delete(appSettings).where(eq(appSettings.key, key));
    },

    async get(key: string) {
      return db.query.appSettings.findFirst({
        where: eq(appSettings.key, key)
      });
    },

    async set(key: string, value: unknown) {
      const now = new Date();

      await db
        .insert(appSettings)
        .values({
          key,
          updatedAt: now,
          valueJson: JSON.stringify(value)
        })
        .onConflictDoUpdate({
          target: appSettings.key,
          set: {
            updatedAt: now,
            valueJson: JSON.stringify(value)
          }
        });
    }
  };
};
