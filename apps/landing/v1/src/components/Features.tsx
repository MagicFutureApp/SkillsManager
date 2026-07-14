import React from 'react';
import { Compass, BookOpen, Group, Award, Sparkles, LayoutGrid } from 'lucide-react';
import { motion } from 'motion/react';

export default function Features() {
  const cards = [
    {
      icon: Compass,
      title: 'Multidimensional Radar Mapping',
      description: 'See the absolute landscape of your career capabilities. Go beyond standard lists and visualize how your engineering, design, and management skills balance together.',
      badge: 'Interactive Viz',
      gridSpan: 'md:col-span-2'
    },
    {
      icon: BookOpen,
      title: 'Actionable Learning Roadmaps',
      description: 'Generate step-by-step pathways to scale your proficiency. Turn broad goals like "Learn Rust" into week-by-week technical topics and hand-picked reading lists.',
      badge: 'Structured',
      gridSpan: 'md:col-span-1'
    },
    {
      icon: Group,
      title: 'Domain and Team Alignment',
      description: 'Group skills into custom domain blocks. Perfect for aligning individual growth goals directly with organizational team objectives and quarter-by-quarter OKRs.',
      badge: 'Collaborative',
      gridSpan: 'md:col-span-1'
    },
    {
      icon: Award,
      title: 'Verified Competency Tiers',
      description: 'Document your evidence. Back up your Skill Levels with direct notes, milestone checkpoints, completed projects, and peer reviews that render in visual detail.',
      badge: 'Robust evidence',
      gridSpan: 'md:col-span-2'
    }
  ];

  const containerVariants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.5, ease: 'easeOut' }
    }
  };

  return (
    <section className="bg-[#0f172a] relative py-20 sm:py-28 border-t border-white/10" id="features">
      {/* Decorative Glow elements */}
      <div className="absolute top-[40%] left-[5%] w-[300px] h-[300px] bg-blue-600/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[10%] right-[5%] w-[400px] h-[400px] bg-purple-600/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 px-3 py-1 text-xs font-bold text-blue-400 tracking-wide">
            <LayoutGrid className="h-3.5 w-3.5" />
            <span>Product Highlights</span>
          </div>
          <h2 className="mt-4 font-display text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Architect your knowledge graph.
          </h2>
          <p className="mt-4 text-lg text-slate-400">
            Skills Manager transforms career growth from an ambiguous guess into a scientific, visual, and highly gamified system.
          </p>
        </div>

        {/* Bento Grid */}
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3"
          id="features-bento-grid"
        >
          {cards.map((card, i) => (
            <motion.div
              key={i}
              variants={itemVariants}
              className={`group flex flex-col justify-between rounded-2xl border border-white/10 bg-white/5 p-6 shadow-xl backdrop-blur-md transition-all hover:bg-white/10 hover:border-white/20 hover:scale-[1.01] ${card.gridSpan}`}
              id={`feature-card-${i}`}
            >
              <div>
                {/* Header Row */}
                <div className="flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950/40 border border-white/10 text-blue-400 group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-500 transition-all shadow-md">
                    <card.icon className="h-5 w-5" />
                  </div>
                  <span className="rounded-full bg-white/5 border border-white/10 px-2.5 py-0.5 font-mono text-[10px] font-bold tracking-wider text-slate-300 uppercase">
                    {card.badge}
                  </span>
                </div>

                {/* Content */}
                <h3 className="mt-6 font-display text-lg font-bold text-white">
                  {card.title}
                </h3>
                <p className="mt-2 text-sm text-slate-400 leading-relaxed">
                  {card.description}
                </p>
              </div>

              {/* Aesthetic Footer Detail */}
              <div className="mt-8 border-t border-white/5 pt-4 flex items-center gap-1.5 text-xs font-semibold text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity">
                <span>Learn how it works</span>
                <span className="transition-transform group-hover:translate-x-0.5">→</span>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
