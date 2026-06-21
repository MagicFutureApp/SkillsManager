import { useEffect, useMemo, useState } from "react";

import {
  adaptSkillRecord,
  filterSkills,
  getSkillRepositoryOptions,
  type Skill,
  type SkillRepositoryFilter,
  type SkillSort,
  type SkillStatusFilter
} from "../components/skills-page-data";

export const useSkillsPageState = () => {
  const [checkedIds, setCheckedIds] = useState<Set<string>>(() => new Set());
  const [query, setQuery] = useState("");
  const [repositoryFilter, setRepositoryFilter] = useState<SkillRepositoryFilter>("all");
  const [skills, setSkills] = useState<Skill[]>([]);
  const [selectedSkillId, setSelectedSkillId] = useState<string | null>(null);
  const [sort, setSort] = useState<SkillSort>("recommended");
  const [statusFilter, setStatusFilter] = useState<SkillStatusFilter>("all");

  useEffect(() => {
    let isMounted = true;

    void loadSkills().then((nextSkills) => {
      if (!isMounted) {
        return;
      }

      setSkills(nextSkills);
      setSelectedSkillId((currentSkillId) => currentSkillId ?? nextSkills[0]?.id ?? null);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  const visibleSkills = useMemo(() => {
    return filterSkills({
      query,
      repository: repositoryFilter,
      skills,
      sort,
      status: statusFilter
    });
  }, [query, repositoryFilter, skills, sort, statusFilter]);

  const repositoryOptions = useMemo(() => getSkillRepositoryOptions(skills), [skills]);

  useEffect(() => {
    if (!visibleSkills.length) {
      setSelectedSkillId(null);
      return;
    }

    setSelectedSkillId((currentSkillId) => {
      if (currentSkillId && visibleSkills.some((skill) => skill.id === currentSkillId)) {
        return currentSkillId;
      }

      return visibleSkills[0]?.id ?? null;
    });
  }, [visibleSkills]);

  useEffect(() => {
    if (repositoryOptions.includes(repositoryFilter)) {
      return;
    }

    setRepositoryFilter("all");
  }, [repositoryFilter, repositoryOptions]);

  const selectedSkill = visibleSkills.find((skill) => skill.id === selectedSkillId) ?? null;
  const visibleIds = visibleSkills.map((skill) => skill.id);
  const visibleCheckedCount = visibleIds.filter((id) => checkedIds.has(id)).length;
  const visibleAllChecked =
    visibleSkills.length > 0 && visibleCheckedCount === visibleSkills.length;
  const visibleSomeChecked = visibleCheckedCount > 0;
  const checkedCount = checkedIds.size;

  const toggleSkillChecked = (skillId: string, checked: boolean) => {
    if (checked) {
      setSelectedSkillId(skillId);
    }

    setCheckedIds((currentIds) => {
      const nextIds = new Set(currentIds);

      if (checked) {
        nextIds.add(skillId);
      } else {
        nextIds.delete(skillId);
      }

      return nextIds;
    });
  };

  const selectAllVisible = (checked: boolean) => {
    setCheckedIds((currentIds) => {
      const nextIds = new Set(currentIds);

      visibleIds.forEach((id) => {
        if (checked) {
          nextIds.add(id);
        } else {
          nextIds.delete(id);
        }
      });

      return nextIds;
    });
  };

  return {
    checkedCount,
    checkedIds,
    query,
    repositoryFilter,
    repositoryOptions,
    selectedSkill,
    selectedSkillId,
    skills,
    sort,
    statusFilter,
    visibleAllChecked,
    visibleSkills,
    visibleSomeChecked,
    selectAllVisible,
    setQuery,
    setRepositoryFilter,
    setSelectedSkillId,
    setSort,
    setStatusFilter,
    toggleSkillChecked
  };
};

export type SkillsPageState = ReturnType<typeof useSkillsPageState>;

const loadSkills = async (): Promise<Skill[]> => {
  const result = await window.skillsManager?.listSkills?.();

  return (result?.skills ?? []).map(adaptSkillRecord);
};
