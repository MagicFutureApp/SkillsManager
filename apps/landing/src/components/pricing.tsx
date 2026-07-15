import React, { useState } from 'react';
import { Check, ShieldAlert, Sparkles, HelpCircle } from 'lucide-react';
import { motion } from 'motion/react';

export default function Pricing() {
  const [isAnnual, setIsAnnual] = useState(true);

  const plans = [
    {
      name: 'Personal Sandbox',
      price: 0,
      description: 'Perfect for individual developers, designers, and strategic planners tracking their own learning targets.',
      features: [
        'Up to 25 skills tracking logs',
        'Dynamic Real-Time Radar Chart',
        'Offline client-side local storage',
        'Syllabus training roadmap simulations',
        'Full CSV data export / import',
        'Basic typography customizations'
      ],
      cta: 'Start Free, No Card Required',
      highlighted: false
    },
    {
      name: 'Team Architect',
      price: isAnnual ? 8 : 10,
      description: 'Built for engineering directors, project managers, and organizations auditing collective capability metrics.',
      features: [
        'Unlimited skills & members log',
        'Cross-functional Team Matrix overlay',
        'Live multi-user dashboard sync',
        'Dedicated secure workspace profiles',
        'Advanced OKRs & goal checkpoints',
        'Priority support & API endpoints'
      ],
      cta: 'Begin 14-Day Free Trial',
      highlighted: true
    }
  ];

  return (
    <section className="bg-white py-20 sm:py-28 border-t border-zinc-200" id="pricing">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-800">
            <Sparkles className="h-3.5 w-3.5 text-zinc-900" />
            <span>Fair Tier Structures</span>
          </div>
          <h2 className="mt-4 font-display text-3xl font-extrabold tracking-tight text-zinc-900 sm:text-4xl">
            Empower growth without borders.
          </h2>
          <p className="mt-4 text-base text-zinc-600">
            Start completely free in our offline client-side environment, or deploy collaborate workspaces for your entire core organization.
          </p>

          {/* Billing Cycle Toggle */}
          <div className="mt-8 flex items-center justify-center gap-3">
            <span className={`text-xs font-semibold ${!isAnnual ? 'text-zinc-900' : 'text-zinc-400'}`}>Monthly</span>
            <button
              onClick={() => setIsAnnual(!isAnnual)}
              className="relative h-6 w-11 rounded-full bg-zinc-200 transition-colors focus:outline-none hover:bg-zinc-300 cursor-pointer"
              aria-label="Toggle Billing"
              id="pricing-billing-toggle"
            >
              <span
                className={`absolute top-1 left-1 h-4 w-4 rounded-full bg-zinc-900 transition-transform ${
                  isAnnual ? 'translate-x-5' : ''
                }`}
              />
            </button>
            <span className={`text-xs font-semibold flex items-center gap-1.5 ${isAnnual ? 'text-zinc-900' : 'text-zinc-400'}`}>
              <span>Annually</span>
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-200">
                Save 20%
              </span>
            </span>
          </div>
        </div>

        {/* Pricing Cards Grid */}
        <div className="mt-16 mx-auto grid max-w-4xl grid-cols-1 gap-8 md:grid-cols-2" id="pricing-cards-container">
          {plans.map((plan, i) => (
            <div
              key={i}
              className={`rounded-2xl border p-8 flex flex-col justify-between transition-all ${
                plan.highlighted
                  ? 'border-zinc-900 bg-zinc-950 text-zinc-50 shadow-lg md:scale-105'
                  : 'border-zinc-200 bg-white text-zinc-900 shadow-sm hover:shadow-md'
              }`}
              id={`pricing-tier-${i}`}
            >
              <div>
                {/* Plan Title / Price */}
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className={`font-display text-lg font-black ${plan.highlighted ? 'text-white' : 'text-zinc-900'}`}>
                      {plan.name}
                    </h3>
                    <p className={`mt-2 text-xs leading-relaxed ${plan.highlighted ? 'text-zinc-400' : 'text-zinc-500'}`}>
                      {plan.description}
                    </p>
                  </div>
                  {plan.highlighted && (
                    <span className="rounded-full bg-violet-600 px-2.5 py-0.5 font-mono text-[9px] font-bold tracking-wider text-white uppercase border border-violet-500 shadow-sm animate-pulse">
                      Popular
                    </span>
                  )}
                </div>

                <div className="mt-6 flex items-baseline">
                  <span className={`font-display text-5xl font-black tracking-tight ${plan.highlighted ? 'text-white' : 'text-zinc-900'}`}>
                    ${plan.price}
                  </span>
                  <span className={`ml-2 text-sm font-semibold ${plan.highlighted ? 'text-zinc-400' : 'text-zinc-500'}`}>
                    /user/month
                  </span>
                </div>

                {/* Features Checklist */}
                <ul className="mt-8 space-y-4">
                  {plan.features.map((feat, idx) => (
                    <li key={idx} className="flex items-start gap-3 text-xs leading-relaxed">
                      <div className={`rounded-full p-0.5 mt-0.5 shrink-0 ${
                        plan.highlighted ? 'bg-violet-500 text-white' : 'bg-zinc-100 text-zinc-900 border border-zinc-200'
                      }`}>
                        <Check className="h-3.5 w-3.5" />
                      </div>
                      <span className={plan.highlighted ? 'text-zinc-300' : 'text-zinc-700'}>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Action Button */}
              <div className="mt-10">
                <button
                  onClick={() => alert(`This sandbox workspace is fully functional offline! To register for the real ${plan.name}, export your credentials.`)}
                  className={`w-full rounded-xl py-3.5 px-4 text-center text-xs font-bold shadow-sm transition-all cursor-pointer ${
                    plan.highlighted
                      ? 'bg-zinc-50 text-zinc-900 hover:bg-zinc-200 active:scale-98'
                      : 'bg-zinc-900 text-zinc-50 hover:bg-zinc-800 active:scale-98'
                  }`}
                  id={`pricing-btn-${i}`}
                >
                  {plan.cta}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Security & Support Guarantee */}
        <div className="mt-12 max-w-xl mx-auto rounded-xl border border-zinc-200 bg-zinc-50 p-4.5 flex gap-3 text-xs text-zinc-600 items-start">
          <ShieldAlert className="h-5 w-5 text-zinc-400 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <span className="font-bold text-zinc-800">Privacy First:</span> Sandbox data runs locally in your browser frame. We never harvest your professional skills or company objectives.
          </p>
        </div>

      </div>
    </section>
  );
}
