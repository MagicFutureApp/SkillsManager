import { Skill, SkillCategory, GeneratedRoadmap } from './types';

export const CATEGORIES: SkillCategory[] = [
  {
    id: 'engineering',
    name: 'Engineering',
    color: '#8b5cf6', // Violet
    borderColor: 'border-violet-200',
    bgColor: 'bg-violet-50',
    textColor: 'text-violet-700',
    description: 'Software development, architecture, tools, and platforms.'
  },
  {
    id: 'design',
    name: 'Design',
    color: '#f43f5e', // Rose
    borderColor: 'border-rose-200',
    bgColor: 'bg-rose-50',
    textColor: 'text-rose-700',
    description: 'User interface, user experience, typography, and visual systems.'
  },
  {
    id: 'product',
    name: 'Product',
    color: '#f59e0b', // Amber
    borderColor: 'border-amber-200',
    bgColor: 'bg-amber-50',
    textColor: 'text-amber-700',
    description: 'Product metrics, user research, roadmap planning, and lifecycle.'
  },
  {
    id: 'strategy',
    name: 'Strategy',
    color: '#10b981', // Emerald
    borderColor: 'border-emerald-200',
    bgColor: 'bg-emerald-50',
    textColor: 'text-emerald-700',
    description: 'Business model design, OKRs, positioning, and data growth.'
  },
  {
    id: 'management',
    name: 'Management',
    color: '#6366f1', // Indigo
    borderColor: 'border-indigo-200',
    bgColor: 'bg-indigo-50',
    textColor: 'text-indigo-700',
    description: 'Mentorship, sprint facilitation, hiring, and cross-functional leadership.'
  }
];

export const INITIAL_SKILLS: Skill[] = [
  {
    id: '1',
    name: 'TypeScript & React',
    category: 'engineering',
    level: 'Proficient',
    progress: 80,
    notes: 'Advanced type architecture, React 19 hooks, and custom state synchronization.',
    updatedAt: '2026-07-10'
  },
  {
    id: '2',
    name: 'Design Systems',
    category: 'design',
    level: 'Intermediate',
    progress: 55,
    notes: 'Figma component libraries, token structures, and high-contrast accessibility.',
    updatedAt: '2026-07-12'
  },
  {
    id: '3',
    name: 'Product Analytics & Funnels',
    category: 'product',
    level: 'Proficient',
    progress: 75,
    notes: 'A/B testing workflows, SQL cohort analysis, and mixpanel dashboard design.',
    updatedAt: '2026-07-13'
  },
  {
    id: '4',
    name: 'Growth OKRs',
    category: 'strategy',
    level: 'Beginner',
    progress: 30,
    notes: 'Defining and tracking leading metrics for cross-functional quarterly initiatives.',
    updatedAt: '2026-07-01'
  },
  {
    id: '5',
    name: 'Active Mentorship',
    category: 'management',
    level: 'Intermediate',
    progress: 60,
    notes: 'Facilitating structured weekly 1-on-1s and designing individual career frameworks.',
    updatedAt: '2026-07-09'
  }
];

export const SAMPLE_ROADMAPS: Record<string, GeneratedRoadmap> = {
  'typescript & react': {
    skillName: 'TypeScript & React',
    level: 'Proficient',
    overview: 'Advance from proficient development to expert architect level. Focus heavily on compiler structures, advanced generic mappings, performance profiling, and state engine abstraction.',
    steps: [
      {
        title: 'Advanced Type Gymnastics',
        duration: 'Week 1-2',
        topics: ['Conditional types & infer keywords', 'Mapped types and template literal types', 'Covariance and contravariance in function arguments'],
        resources: ['TypeScript Deep Dive', 'Advanced TypeScript Type Challenges']
      },
      {
        title: 'Concurrent React & Rendering Engines',
        duration: 'Week 3-4',
        topics: ['React 19 fiber reconciler logic', 'Transitions API & Server Actions', 'Custom Suspense data integrations'],
        resources: ['React 19 Architecture Docs', 'Visualizing React Reconciler']
      },
      {
        title: 'State Engine Architectural Patterns',
        duration: 'Week 5-6',
        topics: ['Finite state machines in UI flow', 'Distributed state management vs Context', 'Optimistic state update pipelines'],
        resources: ['XState Best Practices', 'Designing Large-Scale UI Systems']
      }
    ],
    tips: [
      'Write your types with strict compiler settings (strictPropertyInitialization, exactOptionalPropertyTypes).',
      'Profile application render loops using browser performance tools rather than console logs.',
      'Refactor deep nested state structures into single-source-of-truth stores.'
    ]
  },
  'design systems': {
    skillName: 'Design Systems',
    level: 'Intermediate',
    overview: 'Transition from basic UI design to a standardized design system engineer. Bridge the gap between static design tokens and production codebases.',
    steps: [
      {
        title: 'Semantic Design Tokens',
        duration: 'Week 1-2',
        topics: ['Creating tier-1 global color scales', 'Building semantic alias variables (background-primary, text-muted)', 'Defining responsive typography scales and line-height models'],
        resources: ['Figma Design Tokens Plugin', 'W3C Design Token Community Group']
      },
      {
        title: 'Component Isolation & API design',
        duration: 'Week 3-4',
        topics: ['Designing polymorphic React props', 'Accessible HTML patterns for Screen Readers', 'Radix UI headless integrations'],
        resources: ['Polymorphic Components in React', 'WAI-ARIA Authoring Practices']
      },
      {
        title: 'Automation & Code Synced Pipelines',
        duration: 'Week 5-6',
        topics: ['Style Dictionary compilation to JSON/CSS/JS', 'Automated Figma-to-Github sync via Actions', 'Component visual regression testing'],
        resources: ['Amazon Style Dictionary Guide', 'Storybook Visual Testing handbook']
      }
    ],
    tips: [
      'Prioritize dark and light mode color contrast (WCAG AA/AAA level) at the variable stage.',
      'Document not just the design, but also the developer instructions for using each component.',
      'Build comprehensive testing rigs to verify keyboard focus trap logic.'
    ]
  }
};
