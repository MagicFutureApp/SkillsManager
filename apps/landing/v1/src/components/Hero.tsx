import React from 'react';
import { Play, Sparkles, TrendingUp, Cpu, Award, Milestone } from 'lucide-react';
import { motion } from 'motion/react';

interface HeroProps {
  onScrollToSandbox: () => void;
}

export default function Hero({ onScrollToSandbox }: HeroProps) {
  return (
    <section className="relative overflow-hidden bg-[#0f172a] text-slate-100 pt-20 pb-16 lg:pt-32 lg:pb-24" id="hero">
      {/* Decorative Glow Elements from Frosted Glass Theme */}
      <div className="absolute top-[-100px] left-[-100px] w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-100px] right-[-50px] w-[600px] h-[600px] bg-purple-600/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-[20%] right-[10%] w-[350px] h-[350px] bg-emerald-500/15 rounded-full blur-[100px] pointer-events-none" />

      {/* Grid Overlay with low opacity */}
      <div className="absolute inset-0 z-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-40" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          {/* Tagline Badge */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-1.5 rounded-full border border-blue-500/20 bg-blue-500/10 py-1 px-3.5 text-xs font-bold text-blue-400 tracking-wider shadow-sm"
          >
            <Sparkles className="h-3.5 w-3.5 animate-pulse" />
            <span>Interactive Skills Mapping & Development Engine</span>
          </motion.div>

          {/* Main Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="mt-6 font-display text-4xl font-extrabold leading-[1.1] tracking-tight text-white sm:text-5xl md:text-6xl lg:text-7xl"
          >
            Map, Track, and Master
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-300 to-emerald-300 mt-1">
              Your Professional Core
            </span>
          </motion.h1>

          {/* Subheading */}
          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mx-auto mt-6 max-w-2xl text-base text-slate-400 sm:text-lg md:text-xl leading-relaxed"
          >
            Bridge the gap between business goals and team capabilities. Visualize your skills in a dynamic, 
            multidimensional landscape, and construct custom, step-by-step training roadmaps.
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
              className="rounded-xl bg-blue-600 hover:bg-blue-500 text-white px-6 py-3.5 text-sm font-bold shadow-xl shadow-blue-500/20 transition-all hover:shadow-2xl active:scale-95 cursor-pointer"
              id="hero-btn-primary"
            >
              Open Interactive Sandbox
            </button>
            <button
              onClick={onScrollToSandbox}
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-6 py-3.5 text-sm font-bold text-white shadow-sm transition-all hover:bg-white/10 backdrop-blur-md active:scale-95 cursor-pointer"
              id="hero-btn-secondary"
            >
              <Play className="h-4 w-4 fill-current text-slate-300" />
              <span>Explore Live Dashboard</span>
            </button>
          </motion.div>
        </div>

        {/* Dashboard Visual Mockup Container */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6, type: 'spring', stiffness: 50 }}
          className="mx-auto mt-16 max-w-5xl rounded-3xl border border-white/10 bg-white/5 p-2 shadow-2xl shadow-black/40 backdrop-blur-xl"
          id="hero-mockup"
        >
          <div className="rounded-2xl border border-white/5 bg-slate-950/40 p-4 sm:p-6 lg:p-8 text-white">
            {/* Mock Header Controls */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-rose-500" />
                <div className="h-3 w-3 rounded-full bg-amber-500" />
                <div className="h-3 w-3 rounded-full bg-emerald-500" />
                <span className="ml-2 font-mono text-xs text-slate-500">workspace_v2.1_stable</span>
              </div>
              <div className="flex gap-2">
                <span className="rounded-md bg-white/5 px-2.5 py-1 text-xs font-semibold text-slate-300 border border-white/10 backdrop-blur-md">Personal Space</span>
                <span className="rounded-md bg-gradient-to-r from-blue-500 to-indigo-500 px-2.5 py-1 text-xs font-bold text-white">Active View</span>
              </div>
            </div>

            {/* Mock Metrics Grid */}
            <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[
                { label: 'Tracked Skills', value: '18', icon: Award, color: 'text-violet-400 bg-violet-500/10 border border-violet-500/20' },
                { label: 'Growth Score', value: '84%', icon: TrendingUp, color: 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20' },
                { label: 'Active Targets', value: '4', icon: Milestone, color: 'text-amber-400 bg-amber-500/10 border border-amber-500/20' },
                { label: 'Integrations', value: 'API Sync', icon: Cpu, color: 'text-blue-400 bg-blue-500/10 border border-blue-500/20' }
              ].map((metric, i) => (
                <div key={i} className="rounded-xl border border-white/10 bg-white/5 p-4 shadow-sm backdrop-blur-md">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-400">{metric.label}</span>
                    <div className={`rounded-lg p-1.5 ${metric.color}`}>
                      <metric.icon className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="mt-2 font-display text-2xl font-bold text-white">{metric.value}</div>
                </div>
              ))}
            </div>

            {/* Mock Layout Preview */}
            <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-3">
              <div className="md:col-span-2 rounded-xl border border-white/10 bg-white/5 p-4 shadow-sm backdrop-blur-md">
                <div className="flex items-center justify-between border-b border-white/5 pb-3">
                  <span className="font-display text-sm font-semibold text-white">Capabilities Radar</span>
                  <span className="font-mono text-xs text-slate-500">Dynamic distribution</span>
                </div>
                {/* SVG Mock Radar Map */}
                <div className="flex h-56 items-center justify-center">
                  <svg className="h-44 w-44" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
                    <circle cx="50" cy="50" r="30" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
                    <circle cx="50" cy="50" r="15" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
                    <line x1="50" y1="5" x2="50" y2="95" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
                    <line x1="5" y1="50" x2="95" y2="50" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
                    <polygon points="50,15 75,35 68,70 30,65 25,30" fill="rgba(59, 130, 246, 0.15)" stroke="#3b82f6" strokeWidth="1.5" />
                    <circle cx="50" cy="15" r="2" fill="#3b82f6" />
                    <circle cx="75" cy="35" r="2" fill="#3b82f6" />
                    <circle cx="68" cy="70" r="2" fill="#3b82f6" />
                    <circle cx="30" cy="65" r="2" fill="#3b82f6" />
                    <circle cx="25" cy="30" r="2" fill="#3b82f6" />
                  </svg>
                  <div className="ml-4 space-y-2 text-xs">
                    <div className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-full bg-blue-500" /><span>Engineering</span></div>
                    <div className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-full bg-rose-500" /><span>Design</span></div>
                    <div className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-full bg-amber-500" /><span>Product</span></div>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/5 p-4 shadow-sm backdrop-blur-md flex flex-col justify-between">
                <div>
                  <span className="font-display text-sm font-semibold text-white block">Recent Progress</span>
                  <span className="text-xs text-slate-400 block mt-0.5">Continuous improvement feed</span>
                  
                  <div className="mt-4 space-y-3">
                    {[
                      { name: 'TypeScript', desc: 'Promoted to Proficient', date: 'Yesterday' },
                      { name: 'Figma Components', desc: 'Completed milestone', date: '3 days ago' },
                      { name: 'OKR Architecture', desc: 'Initiated roadmap tracking', date: '1 week ago' }
                    ].map((item, i) => (
                      <div key={i} className="flex gap-2 text-xs border-l border-white/10 pl-3 relative">
                        <div className="absolute -left-1.5 top-1.5 h-2 w-2 rounded-full bg-emerald-400 shadow-md shadow-emerald-400/30" />
                        <div>
                          <p className="font-semibold text-slate-200">{item.name}</p>
                          <p className="text-slate-400">{item.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-4 border-t border-white/5 pt-3">
                  <span className="font-mono text-[10px] tracking-wider text-slate-500 uppercase">Interactive simulation</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
