import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

export const createDbClient = (databasePath: string) => {
  const sqlite = new Database(databasePath);
  sqlite.pragma("journal_mode = WAL");

  return drizzle(sqlite, { schema });
};
