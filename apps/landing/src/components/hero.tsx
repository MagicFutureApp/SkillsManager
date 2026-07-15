import React from 'react';
import { Play, Sparkles, TrendingUp, Cpu, Award, Milestone } from 'lucide-react';
import { motion } from 'motion/react';

interface HeroProps {
  onScrollToSandbox: () => void;
}

export default function Hero({ onScrollToSandbox }: HeroProps) {
  return (
    <section className="relative overflow-hidden bg-zinc-50 pt-20 pb-16 lg:pt-32 lg:pb-24" id="hero">
      {/* Decorative Grid Background */}
      <div className="absolute inset-0 z-0 bg-[linear-gradient(to_right,#e4e4e7_1px,transparent_1px),linear-gradient(to_bottom,#e4e4e7_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-35" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          {/* Tagline Badge */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white py-1 px-3.5 text-xs font-semibold text-zinc-800 shadow-sm"
          >
            <Sparkles className="h-3.5 w-3.5 text-amber-500 animate-pulse" />
            <span>Interactive Skills Mapping & Development Engine</span>
          </motion.div>

          {/* Main Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="mt-6 font-display text-4xl font-extrabold tracking-tight text-zinc-900 sm:text-5xl md:text-6xl lg:text-7xl"
          >
            Map, Track, and Master
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-zinc-900 via-zinc-800 to-zinc-500 mt-1">
              Your Professional Core
            </span>
          </motion.h1>

          {/* Subheading */}
          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mx-auto mt-6 max-w-2xl text-base text-zinc-600 sm:text-lg md:text-xl"
          >
            Ditch the static resume. Visualize your developer and team capabilities in a dynamic, 
            multidimensional landscape. Guide growth with personalized learning roadmaps.
          </motion.p>

          {/* Call to Actions */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.45 }}
            className="mt-10 flex flex-wrap justify-center gap-4"
          >
            <button
              onClick={onScrollToSandbox}
              className="rounded-xl bg-zinc-900 px-6 py-3.5 text-sm font-semibold text-zinc-50 shadow-md transition-all hover:bg-zinc-800 hover:shadow-lg active:scale-95 cursor-pointer"
              id="hero-btn-primary"
            >
              Open Interactive Sandbox
            </button>
            <button
              onClick={onScrollToSandbox}
              className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-6 py-3.5 text-sm font-semibold text-zinc-700 shadow-sm transition-all hover:bg-zinc-50 hover:text-zinc-900 active:scale-95 cursor-pointer"
              id="hero-btn-secondary"
            >
              <Play className="h-4 w-4 fill-current text-zinc-600" />
              <span>Explore Live Dashboard</span>
            </button>
          </motion.div>
        </div>

        {/* Dashboard Visual Mockup Container */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6, type: 'spring', stiffness: 50 }}
          className="mx-auto mt-16 max-w-5xl rounded-2xl border border-zinc-200 bg-white p-2.5 shadow-2xl shadow-zinc-200/50"
          id="hero-mockup"
        >
          <div className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-4 sm:p-6 lg:p-8">
            {/* Mock Header Controls */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-200 pb-5">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-rose-400" />
                <div className="h-3 w-3 rounded-full bg-amber-400" />
                <div className="h-3 w-3 rounded-full bg-emerald-400" />
                <span className="ml-2 font-mono text-xs text-zinc-400">workspace_v2.1_stable</span>
              </div>
              <div className="flex gap-2">
                <span className="rounded-md bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-600 border border-zinc-200">Personal Space</span>
                <span className="rounded-md bg-zinc-900 px-2.5 py-1 text-xs font-medium text-zinc-50">Active View</span>
              </div>
            </div>

            {/* Mock Metrics Grid */}
            <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[
                { label: 'Tracked Skills', value: '18', icon: Award, color: 'text-violet-600 bg-violet-50' },
                { label: 'Growth Score', value: '84%', icon: TrendingUp, color: 'text-emerald-600 bg-emerald-50' },
                { label: 'Active Targets', value: '4', icon: Milestone, color: 'text-amber-600 bg-amber-50' },
                { label: 'Integrations', value: 'API Sync', icon: Cpu, color: 'text-indigo-600 bg-indigo-50' }
              ].map((metric, i) => (
                <div key={i} className="rounded-xl border border-zinc-100 bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-zinc-500">{metric.label}</span>
                    <div className={`rounded-lg p-1.5 ${metric.color}`}>
                      <metric.icon className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="mt-2 font-display text-2xl font-bold text-zinc-900">{metric.value}</div>
                </div>
              ))}
            </div>

            {/* Mock Layout Preview */}
            <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-3">
              <div className="md:col-span-2 rounded-xl border border-zinc-100 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                  <span className="font-display text-sm font-semibold text-zinc-900">Capabilities Radar</span>
                  <span className="font-mono text-xs text-zinc-400">Dynamic distribution</span>
                </div>
                {/* SVG Mock Radar Map */}
                <div className="flex h-56 items-center justify-center">
                  <svg className="h-44 w-44" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="45" fill="none" stroke="#f4f4f5" strokeWidth="1" />
                    <circle cx="50" cy="50" r="30" fill="none" stroke="#f4f4f5" strokeWidth="1" />
                    <circle cx="50" cy="50" r="15" fill="none" stroke="#f4f4f5" strokeWidth="1" />
                    <line x1="50" y1="5" x2="50" y2="95" stroke="#f4f4f5" strokeWidth="1" />
                    <line x1="5" y1="50" x2="95" y2="50" stroke="#f4f4f5" strokeWidth="1" />
                    <polygon points="50,15 75,35 68,70 30,65 25,30" fill="rgba(139, 92, 246, 0.15)" stroke="#8b5cf6" strokeWidth="1.5" />
                    <circle cx="50" cy="15" r="2" fill="#8b5cf6" />
                    <circle cx="75" cy="35" r="2" fill="#8b5cf6" />
                    <circle cx="68" cy="70" r="2" fill="#8b5cf6" />
                    <circle cx="30" cy="65" r="2" fill="#8b5cf6" />
                    <circle cx="25" cy="30" r="2" fill="#8b5cf6" />
                  </svg>
                  <div className="ml-4 space-y-2 text-xs">
                    <div className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-full bg-violet-500" /><span>Engineering</span></div>
                    <div className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-full bg-rose-500" /><span>Design</span></div>
                    <div className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-full bg-amber-500" /><span>Product</span></div>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-zinc-100 bg-white p-4 shadow-sm flex flex-col justify-between">
                <div>
                  <span className="font-display text-sm font-semibold text-zinc-900 block">Recent Progress</span>
                  <span className="text-xs text-zinc-500 block mt-0.5">Continuous improvement feed</span>
                  
                  <div className="mt-4 space-y-3">
                    {[
                      { name: 'TypeScript', desc: 'Promoted to Proficient', date: 'Yesterday' },
                      { name: 'Figma Components', desc: 'Completed milestone', date: '3 days ago' },
                      { name: 'OKR Architecture', desc: 'Initiated roadmap tracking', date: '1 week ago' }
                    ].map((item, i) => (
                      <div key={i} className="flex gap-2 text-xs border-l border-zinc-100 pl-3 relative">
                        <div className="absolute -left-1 top-1 h-2 w-2 rounded-full bg-zinc-900" />
                        <div>
                          <p className="font-semibold text-zinc-800">{item.name}</p>
                          <p className="text-zinc-500">{item.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-4 border-t border-zinc-100 pt-3">
                  <span className="font-mono text-[10px] tracking-wider text-zinc-400 uppercase">Interactive simulation</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
