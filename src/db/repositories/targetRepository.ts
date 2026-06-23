import { asc, count, eq } from "drizzle-orm";

import type { RegisteredTargetRecord, TargetSkillSelection } from "../../core/targets/target-api";
import type { createDbClient } from "../client";
import { agentTargets, repositories, skillTargetPreferences, skillUnits } from "../schema";

type DbClient = ReturnType<typeof createDbClient>;

export const createTargetRepository = (db: DbClient) => {
  return {
    async count(): Promise<number> {
      const rows = await db.select({ value: count() }).from(agentTargets);

      return rows[0]?.value ?? 0;
    },

    async list(): Promise<RegisteredTargetRecord[]> {
      const targetRows = await db.select().from(agentTargets).orderBy(asc(agentTargets.name));
      const preferenceRows = await db
        .select({
          repositoryName: repositories.name,
          skillId: skillUnits.id,
          skillName: skillUnits.name,
          targetId: skillTargetPreferences.agentTargetId
        })
        .from(skillTargetPreferences)
        .innerJoin(skillUnits, eq(skillUnits.id, skillTargetPreferences.skillUnitId))
        .innerJoin(repositories, eq(repositories.id, skillUnits.repositoryId))
        .where(eq(skillTargetPreferences.enabled, true))
        .orderBy(asc(skillUnits.name));
      const selectionsByTargetId = new Map<string, TargetSkillSelection[]>();

      preferenceRows.forEach((row) => {
        const selections = selectionsByTargetId.get(row.targetId) ?? [];

        selections.push({
          id: row.skillId,
          name: row.skillName,
          repository: row.repositoryName
        });
        selectionsByTargetId.set(row.targetId, selections);
      });

      return targetRows.map((target) => {
        const selectedSkills = selectionsByTargetId.get(target.id) ?? [];

        return {
          createdAt: target.createdAt.toISOString(),
          defaultInstallStrategy: target.defaultInstallStrategy,
          enabled: target.enabled,
          id: target.id,
          name: target.name,
          normalizedPath: target.normalizedPath,
          path: target.path,
          selectedSkills,
          skillCount: selectedSkills.length,
          type: target.type,
          updatedAt: target.updatedAt.toISOString()
        };
      });
    }
  };
};
