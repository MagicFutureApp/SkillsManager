import React, { useState } from 'react';
import { Target, ArrowUp, Send, Heart } from 'lucide-react';

interface FooterProps {
  onScrollToTop: () => void;
}

export default function Footer({ onScrollToTop }: FooterProps) {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSubscribed(true);
    setEmail('');
    setTimeout(() => setSubscribed(false), 3000);
  };

  const linkGroups = [
    {
      title: 'Product',
      links: [
        { label: 'Capabilities Map', href: '#sandbox' },
        { label: 'Bento Features', href: '#features' },
        { label: 'Growth Roadmaps', href: '#sandbox' },
        { label: 'Pricing Tiers', href: '#pricing' }
      ]
    },
    {
      title: 'Resources',
      links: [
        { label: 'Developer SDK', href: '#' },
        { label: 'Engineering OKRs', href: '#' },
        { label: 'Knowledge Base', href: '#' },
        { label: 'API Integrations', href: '#' }
      ]
    },
    {
      title: 'Company',
      links: [
        { label: 'Our Mission', href: '#' },
        { label: 'Careers', href: '#' },
        { label: 'Security Standards', href: '#' },
        { label: 'Contact', href: '#' }
      ]
    }
  ];

  return (
    <footer className="bg-zinc-950 text-zinc-400 border-t border-zinc-900" id="footer">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        
        {/* Top Segment: Brand & Newsletter */}
        <div className="grid grid-cols-1 gap-10 border-b border-zinc-900 pb-12 lg:grid-cols-12 lg:gap-8">
          
          {/* Brand Intro */}
          <div className="lg:col-span-4 space-y-4">
            <div className="flex items-center gap-2 text-white">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-zinc-950 shadow-md">
                <Target className="h-5 w-5" />
              </div>
              <span className="font-display text-lg font-bold tracking-tight">Skills Manager</span>
            </div>
            <p className="text-sm text-zinc-400 leading-relaxed max-w-sm">
              An elegant, interactive workspace for lifelong learners and modern teams to visualize, categorize, and execute skill development.
            </p>
          </div>

          {/* Newsletter Form */}
          <div className="lg:col-span-8 lg:flex lg:justify-end">
            <div className="max-w-md w-full space-y-4">
              <h4 className="font-display text-sm font-bold text-white uppercase tracking-wider">
                Join the skills revolution
              </h4>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Receive weekly insights on design systems, technical competency scales, and organization alignment metrics.
              </p>

              <form onSubmit={handleSubscribe} className="flex gap-2">
                <input
                  type="email"
                  required
                  placeholder="Enter your professional email..."
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-xs font-semibold text-white placeholder-zinc-500 focus:border-zinc-700 focus:outline-none"
                />
                <button
                  type="submit"
                  className="flex items-center justify-center gap-1.5 shrink-0 rounded-lg bg-white px-4 py-2.5 text-xs font-bold text-zinc-950 shadow-sm transition-colors hover:bg-zinc-200 cursor-pointer"
                  id="footer-newsletter-btn"
                >
                  {subscribed ? (
                    <span>Subscribed!</span>
                  ) : (
                    <>
                      <span>Join</span>
                      <Send className="h-3.5 w-3.5" />
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Middle Segment: Link Columns */}
        <div className="grid grid-cols-2 gap-8 py-12 md:grid-cols-4 lg:py-16">
          {linkGroups.map((group, idx) => (
            <div key={idx} className="space-y-4">
              <h4 className="font-display text-xs font-bold text-white uppercase tracking-wider">
                {group.title}
              </h4>
              <ul className="space-y-2.5 text-xs font-medium">
                {group.links.map((link, lIdx) => (
                  <li key={lIdx}>
                    <a href={link.href} className="transition-colors hover:text-white">
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* Utility Segment / Back to top */}
          <div className="flex flex-col justify-between items-start md:items-end col-span-2 md:col-span-1">
            <button
              onClick={onScrollToTop}
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900/50 px-3.5 py-2 text-xs font-semibold text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-white cursor-pointer"
              id="footer-back-to-top"
            >
              <span>Back to Top</span>
              <ArrowUp className="h-3.5 w-3.5" />
            </button>
            <span className="text-[10px] text-zinc-500 mt-4 font-mono select-none">
              v1.0.0 Stable Build
            </span>
          </div>
        </div>

        {/* Bottom Segment: Credits */}
        <div className="border-t border-zinc-900 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500">
          <p>© 2026 Skills Manager Landing Page. All rights reserved locally.</p>
          <p className="flex items-center gap-1.5">
            <span>Crafted with</span>
            <Heart className="h-3.5 w-3.5 text-rose-500 fill-rose-500 animate-pulse" />
            <span>for elite technical teams.</span>
          </p>
        </div>

      </div>
    </footer>
  );
}
