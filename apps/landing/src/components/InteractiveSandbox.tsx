import React, { useState, useMemo } from 'react';
import { 
  Plus, Search, Sparkles, Trash2, BookOpen, ChevronRight, 
  CheckCircle2, AlertCircle, RotateCcw, Award, Info, X 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Skill, SkillCategory, SkillLevel, GeneratedRoadmap } from '../types';
import { CATEGORIES, INITIAL_SKILLS, SAMPLE_ROADMAPS } from '../initialData';

export default function InteractiveSandbox() {
  // State for user-managed skills
  const [skills, setSkills] = useState<Skill[]>(INITIAL_SKILLS);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Roadmap states
  const [activeRoadmap, setActiveRoadmap] = useState<GeneratedRoadmap | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  
  // Form states for adding new skill
  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  const [newSkillName, setNewSkillName] = useState<string>('');
  const [newSkillCategory, setNewSkillCategory] = useState<string>('engineering');
  const [newSkillLevel, setNewSkillLevel] = useState<SkillLevel>('Intermediate');
  const [newSkillNotes, setNewSkillNotes] = useState<string>('');

  // 1. Filtered skills based on selection & search
  const filteredSkills = useMemo(() => {
    return skills.filter(skill => {
      const matchesCategory = selectedCategory === 'all' || skill.category === selectedCategory;
      const matchesSearch = skill.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (skill.notes && skill.notes.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesCategory && matchesSearch;
    });
  }, [skills, selectedCategory, searchQuery]);

  // 2. Compute dynamic stats based on CURRENT skills state
  const stats = useMemo(() => {
    const total = skills.length;
    if (total === 0) return { total: 0, averageProgress: 0, activeRoadmaps: 0, expertSkills: 0 };
    
    const sumProgress = skills.reduce((acc, curr) => acc + curr.progress, 0);
    const experts = skills.filter(s => s.level === 'Expert' || s.level === 'Proficient').length;
    
    return {
      total,
      averageProgress: Math.round(sumProgress / total),
      expertSkills: experts,
      activeRoadmaps: activeRoadmap ? 1 : 0
    };
  }, [skills, activeRoadmap]);

  // 3. Dynamic Radar Chart Coordinates Calculation
  // We have 5 categories. Let's calculate a score (0 to 1) for each category based on actual levels.
  const radarScores = useMemo(() => {
    const defaultScores: Record<string, number> = {
      engineering: 0.2,
      design: 0.2,
      product: 0.2,
      strategy: 0.2,
      management: 0.2
    };

    const levelValues: Record<SkillLevel, number> = {
      'Beginner': 0.25,
      'Intermediate': 0.50,
      'Proficient': 0.75,
      'Expert': 1.00
    };

    CATEGORIES.forEach(cat => {
      const catSkills = skills.filter(s => s.category === cat.id);
      if (catSkills.length > 0) {
        const avg = catSkills.reduce((sum, skill) => sum + levelValues[skill.level], 0) / catSkills.length;
        // Map 0-1 nicely, minimum baseline of 0.2 for beautiful geometry
        defaultScores[cat.id] = Math.max(0.2, avg);
      }
    });

    return defaultScores;
  }, [skills]);

  // Calculate polygon points on a 120x120 SVG grid
  const radarPoints = useMemo(() => {
    const cx = 60;
    const cy = 60;
    const maxRadius = 45;

    return CATEGORIES.map((cat, i) => {
      const score = radarScores[cat.id];
      const radius = score * maxRadius;
      const angle = (i * 2 * Math.PI) / 5 - Math.PI / 2; // Start straight up
      const x = cx + radius * Math.cos(angle);
      const y = cy + radius * Math.sin(angle);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
  }, [radarScores]);

  // SVG grid references
  const gridPolygons = useMemo(() => {
    const cx = 60;
    const cy = 60;
    const maxRadius = 45;
    
    // Create 4 concentric grid rings (25%, 50%, 75%, 100%)
    return [0.25, 0.5, 0.75, 1].map((scale) => {
      const radius = scale * maxRadius;
      return CATEGORIES.map((_, i) => {
        const angle = (i * 2 * Math.PI) / 5 - Math.PI / 2;
        const x = cx + radius * Math.cos(angle);
        const y = cy + radius * Math.sin(angle);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      }).join(' ');
    });
  }, []);

  // Category labels for radar positioning
  const categoryLabelCoords = useMemo(() => {
    const cx = 60;
    const cy = 60;
    const labelRadius = 54; // Outside grid

    return CATEGORIES.map((cat, i) => {
      const angle = (i * 2 * Math.PI) / 5 - Math.PI / 2;
      const x = cx + labelRadius * Math.cos(angle);
      const y = cy + labelRadius * Math.sin(angle);
      
      // Fine-tune alignments based on direction
      let textAnchor = 'middle';
      if (Math.cos(angle) > 0.1) textAnchor = 'start';
      else if (Math.cos(angle) < -0.1) textAnchor = 'end';

      return {
        id: cat.id,
        name: cat.name,
        color: cat.color,
        x,
        y,
        textAnchor
      };
    });
  }, []);

  // 4. Handle adding a skill
  const handleAddSkill = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSkillName.trim()) return;

    const levelToProgress: Record<SkillLevel, number> = {
      'Beginner': 25,
      'Intermediate': 50,
      'Proficient': 75,
      'Expert': 95
    };

    const newSkill: Skill = {
      id: Date.now().toString(),
      name: newSkillName.trim(),
      category: newSkillCategory,
      level: newSkillLevel,
      progress: levelToProgress[newSkillLevel],
      notes: newSkillNotes.trim() || undefined,
      updatedAt: new Date().toISOString().split('T')[0]
    };

    setSkills([newSkill, ...skills]);
    
    // Reset form
    setNewSkillName('');
    setNewSkillNotes('');
    setNewSkillLevel('Intermediate');
    setShowAddForm(false);
  };

  // 5. Handle deleting a skill
  const handleDeleteSkill = (id: string) => {
    setSkills(skills.filter(s => s.id !== id));
    // If the active roadmap was for this skill, close it
    if (activeRoadmap && skills.find(s => s.id === id)?.name.toLowerCase() === activeRoadmap.skillName.toLowerCase()) {
      setActiveRoadmap(null);
    }
  };

  // 6. Handle skill progress simulation / upgrade
  const handleImproveSkill = (id: string) => {
    setSkills(skills.map(s => {
      if (s.id === id) {
        let nextLevel = s.level;
        let nextProgress = s.progress + 15;
        if (nextProgress > 100) nextProgress = 100;

        if (s.progress < 25) nextLevel = 'Beginner';
        else if (s.progress >= 25 && s.progress < 50) nextLevel = 'Intermediate';
        else if (s.progress >= 50 && s.progress < 75) nextLevel = 'Proficient';
        else nextLevel = 'Expert';

        return {
          ...s,
          progress: nextProgress,
          level: nextLevel,
          updatedAt: new Date().toISOString().split('T')[0]
        };
      }
      return s;
    }));
  };

  // 7. Reset skills to initial state
  const handleResetSkills = () => {
    setSkills(INITIAL_SKILLS);
    setActiveRoadmap(null);
  };

  // 8. Generate dynamic learning roadmap
  const handleGenerateRoadmap = (skillName: string, level: SkillLevel) => {
    setIsGenerating(true);
    setActiveRoadmap(null);

    // Simulate smart thinking/planning
    setTimeout(() => {
      const normalizedKey = skillName.toLowerCase().trim();
      const predefined = SAMPLE_ROADMAPS[normalizedKey];

      if (predefined) {
        setActiveRoadmap(predefined);
      } else {
        // Dynamically compile a smart fallback custom roadmap
        const dynamicRoadmap: GeneratedRoadmap = {
          skillName: skillName,
          level: level,
          overview: `Custom-tailored learning roadmap to escalate your competence in ${skillName} from your current state as a ${level} to an elite practitioner.`,
          steps: [
            {
              title: `Foundational Mechanics of ${skillName}`,
              duration: 'Weeks 1-2',
              topics: [`Core semantics and environment setups`, `Analyzing constraints and standard design modules`, `Best practices and architecture rules`],
              resources: [`Official ${skillName} Documentation`, `Comprehensive Guide to ${skillName} Patterns`]
            },
            {
              title: 'Practical Application & Performance Integration',
              duration: 'Weeks 3-4',
              topics: [`Real-world integration workflows`, `Optimization metrics and system debugging`, `Building modular test suites`],
              resources: [`Testing practices for ${skillName}`, `Performance Tuning Masterclass`]
            },
            {
              title: 'Production Deployment & Scale Architecture',
              duration: 'Weeks 5-6',
              topics: [`Advanced orchestration and safety guidelines`, `Continuous Integration triggers`, `Monitoring & log review protocols`],
              resources: [`Scaling ${skillName} at Enterprise level`, `Advanced ${skillName} Case Studies`]
            }
          ],
          tips: [
            `Maintain a dedicated workspace or repository to document code experiments in ${skillName}.`,
            `Engage with community standard review rules to audit your work.`,
            `Apply code challenges focusing on performance boundaries once per week.`
          ]
        };
        setActiveRoadmap(dynamicRoadmap);
      }
      setIsGenerating(false);

      // Smooth scroll to the roadmap detail view on mobile
      const el = document.getElementById('roadmap-display-pane');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }, 1200);
  };

  return (
    <section className="bg-zinc-100 py-16 sm:py-24 border-t border-zinc-200" id="sandbox">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-white border border-zinc-200 px-3 py-1 text-xs font-semibold text-zinc-800 shadow-sm">
            <Sparkles className="h-3.5 w-3.5 text-zinc-900" />
            <span>Interactive Playground</span>
          </div>
          <h2 className="mt-4 font-display text-3xl font-extrabold tracking-tight text-zinc-900 sm:text-4xl">
            Experience the Core Interface
          </h2>
          <p className="mt-4 text-base text-zinc-600">
            This isn’t a passive mock. Add your active skills, modify experience levels, and simulate 
            our instant training coach directly in the workspace below.
          </p>
        </div>

        {/* Core Workspace Board */}
        <div className="mt-12 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xl" id="sandbox-workspace">
          
          {/* Workspace Title & Actions Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-200 bg-zinc-50 px-6 py-4.5">
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
              </span>
              <span className="font-display text-sm font-bold text-zinc-800">Sandbox Workspace</span>
            </div>
            
            <div className="flex items-center gap-3">
              <button 
                onClick={handleResetSkills}
                className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 cursor-pointer"
                title="Reset sandbox to original demo skills"
                id="sandbox-btn-reset"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Reset Demo</span>
              </button>

              <button
                onClick={() => setShowAddForm(true)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 px-3.5 py-1.5 text-xs font-semibold text-zinc-50 shadow-sm transition-colors hover:bg-zinc-800 cursor-pointer"
                id="sandbox-btn-add"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Custom Skill</span>
              </button>
            </div>
          </div>

          {/* Core Multi-Pane Grid */}
          <div className="grid grid-cols-1 divide-y divide-zinc-200 lg:grid-cols-12 lg:divide-x lg:divide-y-0">
            
            {/* Left Pane: Analytics & Live Radar (Col span 4) */}
            <div className="p-6 lg:col-span-4 bg-zinc-50/50 flex flex-col justify-between">
              <div>
                <h3 className="font-display text-sm font-bold text-zinc-900">Skill Map Real-Time Metrics</h3>
                <p className="text-xs text-zinc-500 mt-1">Automatically compiled geometric distribution of capabilities.</p>

                {/* Concentric Radar SVG */}
                <div className="my-8 flex justify-center">
                  <div className="relative h-64 w-64 rounded-xl border border-zinc-200 bg-white p-3 shadow-sm flex items-center justify-center">
                    <svg className="h-full w-full overflow-visible" viewBox="0 0 120 120">
                      
                      {/* Grid concentric polygons */}
                      {gridPolygons.map((points, idx) => (
                        <polygon 
                          key={idx} 
                          points={points} 
                          fill="none" 
                          stroke="#e4e4e7" 
                          strokeWidth="0.5" 
                          strokeDasharray="1,1" 
                        />
                      ))}

                      {/* Axes lines */}
                      {CATEGORIES.map((_, i) => {
                        const angle = (i * 2 * Math.PI) / 5 - Math.PI / 2;
                        return (
                          <line 
                            key={i} 
                            x1="60" 
                            y1="60" 
                            x2={(60 + 45 * Math.cos(angle)).toFixed(1)} 
                            y2={(60 + 45 * Math.sin(angle)).toFixed(1)} 
                            stroke="#e4e4e7" 
                            strokeWidth="0.5" 
                          />
                        );
                      })}

                      {/* Active dynamic filled polygon */}
                      <polygon 
                        points={radarPoints} 
                        fill="rgba(139, 92, 246, 0.12)" 
                        stroke="#8b5cf6" 
                        strokeWidth="1.5"
                        className="transition-all duration-500 ease-out-quint"
                      />

                      {/* Category Label Texts */}
                      {categoryLabelCoords.map((coord) => (
                        <text
                          key={coord.id}
                          x={coord.x}
                          y={coord.y + 1.5}
                          fill="#52525b"
                          fontSize="5.5"
                          fontFamily="Space Grotesk, sans-serif"
                          fontWeight="700"
                          textAnchor={coord.textAnchor}
                          className="select-none tracking-tight"
                        >
                          {coord.name}
                        </text>
                      ))}

                    </svg>
                  </div>
                </div>

                {/* Segmented Stats Displays */}
                <div className="grid grid-cols-2 gap-3.5 mt-4">
                  <div className="rounded-xl border border-zinc-200 bg-white p-3.5">
                    <span className="text-[10px] font-bold text-zinc-400 tracking-wide uppercase">Core Scope</span>
                    <p className="font-display text-2xl font-black text-zinc-800 mt-1">{stats.total}</p>
                    <span className="text-[10px] text-zinc-500 block mt-0.5">skills loaded</span>
                  </div>

                  <div className="rounded-xl border border-zinc-200 bg-white p-3.5">
                    <span className="text-[10px] font-bold text-zinc-400 tracking-wide uppercase">Avg. Depth</span>
                    <p className="font-display text-2xl font-black text-zinc-800 mt-1">{stats.averageProgress}%</p>
                    <span className="text-[10px] text-zinc-500 block mt-0.5">competency avg</span>
                  </div>
                </div>
              </div>

              {/* Informative Help Guide */}
              <div className="mt-6 rounded-xl border border-zinc-200 bg-zinc-50 p-3.5 text-xs text-zinc-600 flex items-start gap-2.5">
                <Info className="h-4 w-4 text-zinc-400 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  Adding skills, changing filters, or clicking the <span className="font-semibold">Upgrade Level</span> trigger updates the visual radar scores and metrics instantly.
                </p>
              </div>
            </div>

            {/* Middle Pane: Skills List (Col span 4) */}
            <div className="p-6 lg:col-span-4 flex flex-col justify-between">
              <div>
                {/* Search & Filter Header */}
                <div className="space-y-3.5">
                  <h3 className="font-display text-sm font-bold text-zinc-900">Your Current Core</h3>
                  
                  {/* Search Bar */}
                  <div className="relative">
                    <Search className="absolute top-2.5 left-3 h-4 w-4 text-zinc-400" />
                    <input
                      type="text"
                      placeholder="Search skill title or notes..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full rounded-lg border border-zinc-200 bg-zinc-50 py-2 pl-9.5 pr-4 text-xs font-medium text-zinc-800 placeholder-zinc-400 focus:border-zinc-300 focus:bg-white focus:outline-none"
                    />
                  </div>

                  {/* Horizontal Scrollable Category Filter */}
                  <div className="flex gap-1 overflow-x-auto pb-1.5 scrollbar-thin scrollbar-thumb-zinc-200">
                    <button
                      onClick={() => setSelectedCategory('all')}
                      className={`shrink-0 rounded-lg px-2.5 py-1 text-xs font-semibold border transition-colors cursor-pointer ${
                        selectedCategory === 'all' 
                          ? 'bg-zinc-900 text-zinc-50 border-zinc-900' 
                          : 'bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50'
                      }`}
                    >
                      All ({skills.length})
                    </button>
                    {CATEGORIES.map((cat) => {
                      const count = skills.filter(s => s.category === cat.id).length;
                      return (
                        <button
                          key={cat.id}
                          onClick={() => setSelectedCategory(cat.id)}
                          className={`shrink-0 rounded-lg px-2.5 py-1 text-xs font-semibold border transition-colors cursor-pointer ${
                            selectedCategory === cat.id 
                              ? 'bg-zinc-900 text-zinc-50 border-zinc-900' 
                              : 'bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50'
                          }`}
                        >
                          {cat.name} ({count})
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Active Skills List Scroll Area */}
                <div className="mt-5 space-y-3 max-h-[420px] overflow-y-auto pr-1">
                  <AnimatePresence initial={false}>
                    {filteredSkills.length === 0 ? (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="rounded-xl border border-dashed border-zinc-200 p-8 text-center"
                      >
                        <AlertCircle className="h-6 w-6 text-zinc-400 mx-auto" />
                        <p className="mt-2 text-xs font-medium text-zinc-500">No matching skills found in this workspace filter.</p>
                      </motion.div>
                    ) : (
                      filteredSkills.map((skill) => {
                        const catDetail = CATEGORIES.find(c => c.id === skill.category);
                        return (
                          <motion.div
                            key={skill.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.2 }}
                            className="group relative rounded-xl border border-zinc-200 bg-white p-4 shadow-sm hover:border-zinc-300 transition-colors"
                          >
                            {/* Skill Card Header */}
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <span className={`inline-block rounded px-2 py-0.5 text-[9px] font-bold tracking-wider uppercase border ${catDetail?.borderColor} ${catDetail?.bgColor} ${catDetail?.textColor}`}>
                                  {catDetail?.name}
                                </span>
                                <h4 className="font-display text-sm font-extrabold text-zinc-900 mt-1">{skill.name}</h4>
                              </div>

                              <button
                                onClick={() => handleDeleteSkill(skill.id)}
                                className="rounded p-1 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-rose-600 cursor-pointer"
                                title="Remove skill"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>

                            {/* Level Badge / Notes */}
                            <div className="mt-2.5 flex items-center justify-between text-xs">
                              <div className="flex items-center gap-1">
                                <span className="font-medium text-zinc-500">Level:</span>
                                <span className="font-bold text-zinc-800">{skill.level}</span>
                              </div>
                              <span className="font-mono text-[10px] text-zinc-400">Updated {skill.updatedAt}</span>
                            </div>

                            {/* Progress bar container */}
                            <div className="mt-3">
                              <div className="flex items-center justify-between text-[10px] font-bold text-zinc-500">
                                <span>Progress</span>
                                <span>{skill.progress}%</span>
                              </div>
                              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-zinc-100">
                                <div 
                                  className="h-full bg-zinc-900 transition-all duration-500" 
                                  style={{ width: `${skill.progress}%` }} 
                                />
                              </div>
                            </div>

                            {skill.notes && (
                              <p className="mt-2.5 text-xs text-zinc-500 bg-zinc-50/50 p-2 rounded border border-zinc-100 leading-relaxed italic">
                                "{skill.notes}"
                              </p>
                            )}

                            {/* Actions Tray */}
                            <div className="mt-3.5 flex items-center justify-between border-t border-zinc-100 pt-3 gap-2">
                              <button
                                onClick={() => handleImproveSkill(skill.id)}
                                className="rounded-lg bg-zinc-50 border border-zinc-200 px-2.5 py-1 text-[11px] font-bold text-zinc-700 transition-colors hover:bg-zinc-100 hover:text-zinc-900 cursor-pointer"
                              >
                                Upgrade Level
                              </button>

                              <button
                                onClick={() => handleGenerateRoadmap(skill.name, skill.level)}
                                className="group flex items-center gap-1 rounded-lg bg-zinc-900 px-2.5 py-1 text-[11px] font-semibold text-zinc-50 transition-colors hover:bg-zinc-800 cursor-pointer"
                              >
                                <Sparkles className="h-3 w-3 text-amber-300" />
                                <span>Get Roadmap</span>
                              </button>
                            </div>
                          </motion.div>
                        );
                      })
                    )}
                  </AnimatePresence>
                </div>
              </div>
              
              <div className="mt-6 border-t border-zinc-100 pt-3 flex items-center justify-between">
                <span className="text-[10px] font-mono text-zinc-400 uppercase">Local state persistence</span>
              </div>
            </div>

            {/* Right Pane: AI Assistant Roadmap Generator (Col span 4) */}
            <div className="p-6 lg:col-span-4 bg-zinc-50/20" id="roadmap-display-pane">
              <div className="flex flex-col h-full justify-between">
                
                <div>
                  <div className="flex items-center justify-between border-b border-zinc-200 pb-3">
                    <div>
                      <h3 className="font-display text-sm font-bold text-zinc-900 flex items-center gap-1.5">
                        <BookOpen className="h-4 w-4 text-violet-600" />
                        <span>Interactive Learning Coach</span>
                      </h3>
                      <p className="text-xs text-zinc-500 mt-0.5">Automated training path synthesizer.</p>
                    </div>
                  </div>

                  <div className="mt-5">
                    {/* State: IDLE */}
                    {!isGenerating && !activeRoadmap && (
                      <div className="rounded-xl border border-dashed border-zinc-200 bg-white p-8 text-center flex flex-col items-center justify-center min-h-[300px]">
                        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-violet-50 text-violet-600">
                          <Sparkles className="h-5.5 w-5.5 text-violet-600" />
                        </div>
                        <h4 className="mt-4 font-display text-sm font-bold text-zinc-800">No Roadmap Loaded</h4>
                        <p className="mt-2 text-xs text-zinc-500 max-w-xs leading-relaxed mx-auto">
                          Click <span className="font-bold text-zinc-700">Get Roadmap</span> on any skill card to simulate our AI coach constructing a personalized learning syllabus.
                        </p>
                      </div>
                    )}

                    {/* State: GENERATING (LOADING) */}
                    {isGenerating && (
                      <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center flex flex-col items-center justify-center min-h-[300px]">
                        <div className="relative flex h-10 w-10 items-center justify-center">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-violet-400 opacity-30"></span>
                          <span className="relative flex h-6 w-6 rounded-full bg-violet-600 animate-spin" style={{ borderTopColor: 'transparent', borderLeftColor: 'transparent' }}></span>
                        </div>
                        <h4 className="mt-5 font-display text-xs font-bold tracking-wider text-zinc-400 uppercase animate-pulse">Consulting engine...</h4>
                        <p className="mt-2.5 text-xs text-zinc-500 leading-relaxed max-w-xs">
                          Analyzing proficiency tier and compiling week-by-week technical topics and reading list.
                        </p>
                      </div>
                    )}

                    {/* State: ROADMAP READY (RENDER) */}
                    {!isGenerating && activeRoadmap && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="space-y-4 max-h-[460px] overflow-y-auto pr-1"
                      >
                        {/* Summary Header */}
                        <div className="rounded-xl bg-violet-50/50 border border-violet-100 p-4">
                          <div className="flex items-center gap-1.5 text-violet-700">
                            <Award className="h-4 w-4" />
                            <span className="text-[11px] font-bold tracking-wider uppercase">Path: {activeRoadmap.skillName}</span>
                          </div>
                          <p className="mt-1.5 text-xs font-semibold text-zinc-700 leading-relaxed">
                            {activeRoadmap.overview}
                          </p>
                        </div>

                        {/* Steps Syllabus */}
                        <div className="space-y-3.5">
                          <h4 className="font-display text-xs font-black text-zinc-400 tracking-wider uppercase">Syllabus Breakdown</h4>
                          
                          {activeRoadmap.steps.map((step, idx) => (
                            <div key={idx} className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm relative">
                              <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
                                <span className="font-display text-xs font-black text-zinc-800">
                                  Step {idx + 1}: {step.title}
                                </span>
                                <span className="rounded bg-zinc-100 border border-zinc-200 px-1.5 py-0.5 font-mono text-[9px] font-semibold text-zinc-500">
                                  {step.duration}
                                </span>
                              </div>

                              {/* Topics */}
                              <div className="mt-2.5 space-y-1.5">
                                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">Key Topics</span>
                                <ul className="space-y-1">
                                  {step.topics.map((t, tIdx) => (
                                    <li key={tIdx} className="flex items-start gap-1.5 text-xs text-zinc-600">
                                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                                      <span>{t}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>

                              {/* Resources */}
                              <div className="mt-3.5 border-t border-zinc-100 pt-2.5 flex items-center justify-between text-[11px]">
                                <span className="font-semibold text-zinc-400 uppercase tracking-wide text-[9px]">Resource</span>
                                <span className="text-zinc-600 italic">{step.resources[0]}</span>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Professional Tips */}
                        <div className="rounded-xl border border-zinc-200 bg-white p-4">
                          <span className="font-display text-xs font-black text-zinc-400 tracking-wider uppercase block mb-2.5">Pro Coaching Tips</span>
                          <ul className="space-y-2">
                            {activeRoadmap.tips.map((tip, idx) => (
                              <li key={idx} className="flex gap-2 text-xs text-zinc-600 leading-relaxed">
                                <ChevronRight className="h-3.5 w-3.5 text-zinc-900 shrink-0 mt-0.5" />
                                <span>{tip}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </motion.div>
                    )}
                  </div>
                </div>

                <div className="mt-6 border-t border-zinc-100 pt-3 text-[10px] text-zinc-400 font-mono text-right">
                  AI roadmap simulation engine v1.0
                </div>

              </div>
            </div>

          </div>
        </div>
      </div>

      {/* MODAL: ADD SKILL FORM */}
      <AnimatePresence>
        {showAddForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddForm(false)}
              className="absolute inset-0 bg-zinc-900/40 backdrop-blur-sm"
            />

            {/* Modal Body */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl z-10"
              id="add-skill-modal"
            >
              {/* Close Button */}
              <button 
                onClick={() => setShowAddForm(false)}
                className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-600 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>

              <h3 className="font-display text-lg font-bold text-zinc-900">Add Skill to Workspace</h3>
              <p className="text-xs text-zinc-500 mt-1">Populate a custom competency target to analyze on the radar map.</p>

              <form onSubmit={handleAddSkill} className="mt-5 space-y-4">
                {/* Name */}
                <div>
                  <label className="block text-xs font-bold text-zinc-600 uppercase tracking-wider mb-1.5">Skill Name</label>
                  <input
                    type="text"
                    required
                    value={newSkillName}
                    onChange={(e) => setNewSkillName(e.target.value)}
                    placeholder="e.g. Next.js, Figma Auto Layout, OKRs"
                    className="w-full rounded-lg border border-zinc-200 py-2.5 px-3.5 text-sm font-medium text-zinc-800 placeholder-zinc-400 focus:border-zinc-300 focus:outline-none focus:ring-1 focus:ring-zinc-300"
                    id="add-skill-input-name"
                  />
                </div>

                {/* Category & Level */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-zinc-600 uppercase tracking-wider mb-1.5">Category</label>
                    <select
                      value={newSkillCategory}
                      onChange={(e) => setNewSkillCategory(e.target.value)}
                      className="w-full rounded-lg border border-zinc-200 py-2.5 px-3.5 text-sm font-medium text-zinc-800 bg-white focus:border-zinc-300 focus:outline-none focus:ring-1 focus:ring-zinc-300"
                      id="add-skill-select-category"
                    >
                      {CATEGORIES.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-600 uppercase tracking-wider mb-1.5">Proficiency</label>
                    <select
                      value={newSkillLevel}
                      onChange={(e) => setNewSkillLevel(e.target.value as SkillLevel)}
                      className="w-full rounded-lg border border-zinc-200 py-2.5 px-3.5 text-sm font-medium text-zinc-800 bg-white focus:border-zinc-300 focus:outline-none focus:ring-1 focus:ring-zinc-300"
                      id="add-skill-select-level"
                    >
                      <option value="Beginner">Beginner</option>
                      <option value="Intermediate">Intermediate</option>
                      <option value="Proficient">Proficient</option>
                      <option value="Expert">Expert</option>
                    </select>
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-xs font-bold text-zinc-600 uppercase tracking-wider mb-1.5">Verification Notes (Optional)</label>
                  <textarea
                    value={newSkillNotes}
                    onChange={(e) => setNewSkillNotes(e.target.value)}
                    placeholder="Document active projects, books, or certificates supporting this level..."
                    rows={3}
                    className="w-full rounded-lg border border-zinc-200 py-2.5 px-3.5 text-sm font-medium text-zinc-800 placeholder-zinc-400 focus:border-zinc-300 focus:outline-none focus:ring-1 focus:ring-zinc-300 resize-none"
                    id="add-skill-input-notes"
                  />
                </div>

                {/* Actions */}
                <div className="pt-3 border-t border-zinc-100 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="rounded-lg border border-zinc-200 bg-white px-4 py-2.5 text-xs font-semibold text-zinc-600 transition-colors hover:bg-zinc-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-lg bg-zinc-900 px-4.5 py-2.5 text-xs font-semibold text-zinc-50 shadow-sm transition-colors hover:bg-zinc-800 cursor-pointer"
                    id="add-skill-btn-submit"
                  >
                    Add Skill
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
}
