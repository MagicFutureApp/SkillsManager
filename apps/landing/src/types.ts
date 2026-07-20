export type SkillLevel = "待同步" | "可分发" | "已安装" | "需复核";

export interface Skill {
  id: string;
  name: string;
  category: string;
  level: SkillLevel;
  progress: number;
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

export interface DistributionStep {
  title: string;
  duration: string;
  topics: string[];
  resources: string[];
}

export interface DistributionPreview {
  skillName: string;
  level: SkillLevel;
  overview: string;
  steps: DistributionStep[];
  tips: string[];
}
