import { and, asc, desc, like, or, sql } from "drizzle-orm";

import type { Best100SkillRecord } from "../../core/best-100/parse-csv";
import { best100Skills } from "../schema";
import type { createDbClient } from "../client";

type DbClient = ReturnType<typeof createDbClient>;

export type Best100Sort = "rank" | "name" | "wis";

export type Best100SearchInput = {
  query?: string;
  sort?: Best100Sort;
  page?: number;
  pageSize?: number;
};

export type Best100SearchResult = {
  items: Best100SkillRecord[];
  total: number;
};

const buildWhere = (query: string) => {
  const trimmed = query.trim();

  if (!trimmed) {
    return undefined;
  }

  const pattern = `%${trimmed}%`;

  return or(
    like(best100Skills.skill, pattern),
    like(best100Skills.vendor, pattern),
    like(best100Skills.description, pattern),
    like(best100Skills.descriptionZh, pattern)
  );
};

const buildOrderBy = (sort: Best100Sort) => {
  if (sort === "name") {
    return asc(best100Skills.skill);
  }

  if (sort === "wis") {
    return desc(sql`CAST(${best100Skills.wis} AS REAL)`);
  }

  return asc(best100Skills.rank);
};

export const createBest100Repository = (db: DbClient) => {
  return {
    async clear(): Promise<void> {
      await db.delete(best100Skills);
    },

    /** Overwrites the local cache with the latest fetched rows. */
    async upsertAll(records: Best100SkillRecord[]): Promise<number> {
      await db.delete(best100Skills);

      if (records.length === 0) {
        return 0;
      }

      await db.insert(best100Skills).values(records);

      return records.length;
    },

    async search(input: Best100SearchInput = {}): Promise<Best100SearchResult> {
      const query = input.query ?? "";
      const sort = input.sort ?? "rank";
      const page = Math.max(1, input.page ?? 1);
      const pageSize = Math.max(1, input.pageSize ?? 50);
      const where = buildWhere(query);

      const total = await db.$count(best100Skills, where);
      const items = await db
        .select()
        .from(best100Skills)
        .where(where)
        .orderBy(buildOrderBy(sort))
        .limit(pageSize)
        .offset((page - 1) * pageSize);

      return { items, total };
    },

    async getSyncableCount(): Promise<number> {
      return db.$count(best100Skills);
    }
  };
};
