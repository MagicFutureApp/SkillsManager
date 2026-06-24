import { asc, count, eq } from "drizzle-orm";

import type {
  RegisteredTargetRecord,
  TargetRegistrationScope,
  TargetSkillPreference,
  TargetSkillSelection
} from "../../core/targets/target-api";
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
          enabled: skillTargetPreferences.enabled,
          repositoryName: repositories.name,
          skillId: skillUnits.id,
          skillName: skillUnits.name,
          targetId: skillTargetPreferences.agentTargetId
        })
        .from(skillTargetPreferences)
        .innerJoin(skillUnits, eq(skillUnits.id, skillTargetPreferences.skillUnitId))
        .innerJoin(repositories, eq(repositories.id, skillUnits.repositoryId))
        .orderBy(asc(skillUnits.name));
      const selectionsByTargetId = new Map<string, TargetSkillSelection[]>();
      const preferencesByTargetId = new Map<string, TargetSkillPreference[]>();

      preferenceRows.forEach((row) => {
        const preference = {
          enabled: row.enabled,
          id: row.skillId,
          name: row.skillName,
          repository: row.repositoryName
        };
        const preferences = preferencesByTargetId.get(row.targetId) ?? [];

        preferences.push(preference);
        preferencesByTargetId.set(row.targetId, preferences);

        if (row.enabled) {
          const selections = selectionsByTargetId.get(row.targetId) ?? [];

          selections.push({
            id: row.skillId,
            name: row.skillName,
            repository: row.repositoryName
          });
          selectionsByTargetId.set(row.targetId, selections);
        }
      });

      return targetRows.map((target) => {
        const selectedSkills = selectionsByTargetId.get(target.id) ?? [];
        const skillPreferences = preferencesByTargetId.get(target.id) ?? [];

        return {
          createdAt: target.createdAt.toISOString(),
          defaultInstallStrategy: target.defaultInstallStrategy,
          enabled: target.enabled,
          id: target.id,
          name: target.name,
          normalizedPath: target.normalizedPath,
          path: target.path,
          selectedSkills,
          skillPreferences,
          skillCount: selectedSkills.length,
          scope: normalizeScope(target.scope),
          type: target.type,
          updatedAt: target.updatedAt.toISOString()
        };
      });
    }
  };
};

const normalizeScope = (scope: string): TargetRegistrationScope => {
  if (scope === "independent") {
    return scope;
  }

  return "global";
};
