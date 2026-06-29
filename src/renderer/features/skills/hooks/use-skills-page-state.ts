import { useEffect, useMemo, useState } from "react";

import type { DistributionPreviewResult } from "@/global";
import {
  clampPageNumber,
  createPaginationState,
  DEFAULT_PAGE_SIZE,
  getPagedItems,
  type PaginationState
} from "@/lib/pagination";
import {
  adaptSkillRecord,
  adaptTargetOption,
  filterSkills,
  getSkillRepositoryOptions,
  getTargetOptionsForSkill,
  getSelectedSkillsDistributionState,
  type Skill,
  type SkillRepositoryFilter,
  type SkillSort,
  type TargetOption
} from "../components/skills-page-data";

export const useSkillsPageState = () => {
  const [checkedIds, setCheckedIds] = useState<Set<string>>(() => new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [distributionNoticeKey, setDistributionNoticeKey] = useState<string | null>(null);
  const [distributionPreview, setDistributionPreview] = useState<DistributionPreviewResult | null>(
    null
  );
  const [distributionPreviewDialogOpen, setDistributionPreviewDialogOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [repositoryFilter, setRepositoryFilter] = useState<SkillRepositoryFilter>("all");
  const [isDistributionPreviewLoading, setIsDistributionPreviewLoading] = useState(false);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [selectedSkillId, setSelectedSkillId] = useState<string | null>(null);
  const [sort, setSort] = useState<SkillSort>("name");
  const [targetOptions, setTargetOptions] = useState<TargetOption[]>([]);

  useEffect(() => {
    let isMounted = true;

    void loadSkillsPageData().then(({ skills: nextSkills, targetOptions: nextTargetOptions }) => {
      if (!isMounted) {
        return;
      }

      setSkills(nextSkills);
      setTargetOptions(nextTargetOptions);
      setSelectedSkillId((currentSkillId) => currentSkillId ?? nextSkills[0]?.id ?? null);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredSkills = useMemo(() => {
    return filterSkills({
      query,
      repository: repositoryFilter,
      skills,
      sort
    });
  }, [query, repositoryFilter, skills, sort]);

  const repositoryOptions = useMemo(() => getSkillRepositoryOptions(skills), [skills]);
  const pagination = useMemo<PaginationState>(() => {
    return createPaginationState({
      currentPage,
      pageSize: DEFAULT_PAGE_SIZE,
      totalItems: filteredSkills.length
    });
  }, [currentPage, filteredSkills.length]);
  const visibleSkills = useMemo(() => {
    return getPagedItems(filteredSkills, pagination);
  }, [filteredSkills, pagination]);

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
    setCurrentPage(1);
  }, [query, repositoryFilter, sort]);

  useEffect(() => {
    setCurrentPage((current) => clampPageNumber(current, pagination.totalPages));
  }, [pagination.totalPages]);

  useEffect(() => {
    if (repositoryOptions.includes(repositoryFilter)) {
      return;
    }

    setRepositoryFilter("all");
  }, [repositoryFilter, repositoryOptions]);

  const selectedSkill = visibleSkills.find((skill) => skill.id === selectedSkillId) ?? null;
  const selectedSkillTargetOptions = useMemo(() => {
    return getTargetOptionsForSkill(targetOptions, selectedSkill);
  }, [selectedSkill, targetOptions]);
  const visibleIds = visibleSkills.map((skill) => skill.id);
  const checkedSkills = skills.filter((skill) => checkedIds.has(skill.id));
  const visibleCheckedCount = visibleIds.filter((id) => checkedIds.has(id)).length;
  const visibleAllChecked =
    visibleSkills.length > 0 && visibleCheckedCount === visibleSkills.length;
  const visibleSomeChecked = visibleCheckedCount > 0;
  const checkedCount = checkedIds.size;
  const checkedDistributionState = getSelectedSkillsDistributionState(checkedSkills);

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

  const setSkillsPage = (pageNumber: number) => {
    setCurrentPage(clampPageNumber(pageNumber, pagination.totalPages));
  };

  const announceDistributionUnavailable = () => {
    setDistributionNoticeKey("skills.actions.syncUnavailableStatus");
  };

  const previewSelectedSkillDistribution = async () => {
    if (!selectedSkill || selectedSkill.targets.length === 0) {
      return;
    }

    const previewDistributionPlan = window.skillsManager?.previewDistributionPlan;

    if (!previewDistributionPlan) {
      setDistributionNoticeKey("skills.actions.previewUnavailableStatus");
      return;
    }

    setIsDistributionPreviewLoading(true);

    try {
      const preview = await previewDistributionPlan({
        skillUnitIds: [selectedSkill.id],
        triggerSource: "skill_detail"
      });

      setDistributionPreview(preview);
      setDistributionPreviewDialogOpen(true);
      setDistributionNoticeKey("skills.actions.previewGeneratedStatus");
    } catch {
      setDistributionNoticeKey("skills.actions.previewFailedStatus");
    } finally {
      setIsDistributionPreviewLoading(false);
    }
  };

  const closeDistributionPreviewDialog = () => {
    setDistributionPreviewDialogOpen(false);
  };

  const toggleSkillTargetPreference = (skillId: string, targetId: string, enabled: boolean) => {
    setSkills((currentSkills) => {
      return currentSkills.map((skill) => {
        if (skill.id !== skillId) {
          return skill;
        }

        const nextTargets = enabled
          ? Array.from(new Set([...skill.targets, targetId]))
          : skill.targets.filter((id) => id !== targetId);

        return {
          ...skill,
          targets: nextTargets
        };
      });
    });
    setTargetOptions((currentTargets) => {
      return currentTargets.map((target) => {
        if (target.id !== targetId || target.skillPreferenceIds.includes(skillId)) {
          return target;
        }

        return {
          ...target,
          skillPreferenceIds: [...target.skillPreferenceIds, skillId]
        };
      });
    });

    void window.skillsManager?.setSkillTargetPreference?.({
      agentTargetId: targetId,
      enabled,
      skillUnitId: skillId
    });
  };

  const addSyncTargetForSelectedSkill = async () => {
    if (!selectedSkill) {
      return;
    }

    const selectedPath = await window.skillsManager?.selectTargetDirectory?.();

    if (!selectedPath) {
      return;
    }

    const result = await window.skillsManager?.addSkillDirectoryTarget?.({
      skillUnitId: selectedSkill.id,
      targetPath: selectedPath
    });
    const nextTargets = (result?.registeredTargets ?? [])
      .filter((target) => target.enabled)
      .map(adaptTargetOption);
    const nextSelectedSkillTargets = nextTargets
      .filter((target) => {
        if (target.scope === "global") {
          return selectedSkill.targets.includes(target.id);
        }

        return target.selectedSkillIds.includes(selectedSkill.id);
      })
      .map((target) => target.id);

    setTargetOptions(nextTargets);
    setSkills((currentSkills) => {
      return currentSkills.map((skill) => {
        if (skill.id !== selectedSkill.id) {
          return skill;
        }

        return {
          ...skill,
          targets: nextSelectedSkillTargets
        };
      });
    });
  };

  return {
    checkedDistributionState,
    checkedCount,
    checkedIds,
    distributionNoticeKey,
    distributionNoticeVisible: Boolean(distributionNoticeKey),
    distributionPreview,
    distributionPreviewDialogOpen,
    isDistributionPreviewLoading,
    query,
    repositoryFilter,
    repositoryOptions,
    pagination,
    selectedSkill,
    selectedSkillId,
    selectedSkillTargetOptions,
    skills,
    sort,
    visibleAllChecked,
    visibleSkills,
    visibleSomeChecked,
    announceDistributionUnavailable,
    closeDistributionPreviewDialog,
    previewSelectedSkillDistribution,
    selectAllVisible,
    setSkillsPage,
    setQuery,
    setRepositoryFilter,
    setSelectedSkillId,
    setSort,
    addSyncTargetForSelectedSkill,
    toggleSkillChecked,
    toggleSkillTargetPreference
  };
};

export type SkillsPageState = ReturnType<typeof useSkillsPageState>;

const loadSkillsPageData = async (): Promise<{
  skills: Skill[];
  targetOptions: TargetOption[];
}> => {
  const [skillsResult, targetsResult] = await Promise.all([
    window.skillsManager?.listSkills?.(),
    window.skillsManager?.listTargets?.()
  ]);

  return {
    skills: (skillsResult?.skills ?? []).map(adaptSkillRecord),
    targetOptions: (targetsResult?.registeredTargets ?? [])
      .filter((target) => target.enabled)
      .map(adaptTargetOption)
  };
};
