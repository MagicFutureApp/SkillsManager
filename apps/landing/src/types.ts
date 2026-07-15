export type SkillLevel = 'Beginner' | 'Intermediate' | 'Proficient' | 'Expert';

export interface Skill {
  id: string;
  name: string;
  category: string;
  level: SkillLevel;
  progress: number; // 0 to 100
  notes?: string;
  updatedAt: string;
}

export interface SkillCategory {
  id: string;
  name: string;
  color: string;
  borderColor: string;
  bgColor: string;
  textColor: string;
  description: string;
}

export interface RoadmapStep {
  title: string;
  duration: string;
  topics: string[];
  resources: string[];
}

export interface GeneratedRoadmap {
  skillName: string;
  level: SkillLevel;
  overview: string;
  steps: RoadmapStep[];
  tips: string[];
}
