import type { createDbClient } from "../../db/client.js";

export type DbClient = ReturnType<typeof createDbClient>;
export type DbProvider<TDb = DbClient> = TDb | (() => TDb);

export const resolveDb = <TDb = DbClient>(db: DbProvider<TDb>): TDb => {
  return typeof db === "function" ? (db as () => TDb)() : db;
};
