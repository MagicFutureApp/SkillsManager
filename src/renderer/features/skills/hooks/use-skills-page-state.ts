import { useEffect, useState } from "react";

import { adaptSkillRecord, type Skill } from "../components/skills-page-data";

export const useSkillsPageState = () => {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [selectedSkillId, setSelectedSkillId] = useState<string | null>(null);

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

  const selectedSkill = skills.find((skill) => skill.id === selectedSkillId) ?? null;

  return {
    selectedSkill,
    selectedSkillId,
    skills,
    setSelectedSkillId
  };
};

export type SkillsPageState = ReturnType<typeof useSkillsPageState>;

const loadSkills = async (): Promise<Skill[]> => {
  const result = await window.skillsManager?.listSkills?.();

  return (result?.skills ?? []).map(adaptSkillRecord);
};
