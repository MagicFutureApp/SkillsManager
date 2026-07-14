import React, { useState } from 'react';
import { Target, Menu, X, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface HeaderProps {
  onScrollTo: (sectionId: string) => void;
}

export default function Header({ onScrollTo }: HeaderProps) {
  const [isOpen, setIsOpen] = useState(false);

  const navItems = [
    { label: 'Features', id: 'features' },
    { label: 'Interactive Demo', id: 'sandbox' },
    { label: 'Pricing', id: 'pricing' }
  ];

  const handleNavClick = (id: string) => {
    onScrollTo(id);
    setIsOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-slate-950/40 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand Logo */}
        <div 
          onClick={() => handleNavClick('hero')} 
          className="flex cursor-pointer items-center gap-2.5 text-white transition-opacity hover:opacity-90"
          id="nav-logo"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-400 to-emerald-400 text-white font-bold shadow-lg shadow-blue-500/20">
            <Target className="h-5 w-5" />
          </div>
          <span className="font-display text-lg font-bold tracking-tight text-white">Skills Manager</span>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-8">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              className="text-sm font-medium text-slate-300 transition-colors hover:text-white cursor-pointer"
              id={`nav-link-${item.id}`}
            >
              {item.label}
            </button>
          ))}
        </nav>

        {/* Desktop Call to Actions */}
        <div className="hidden md:flex items-center gap-4">
          <button 
            onClick={() => handleNavClick('sandbox')} 
            className="text-sm font-medium text-slate-300 hover:text-white transition-colors cursor-pointer"
            id="nav-btn-demo"
          >
            Try Sandbox
          </button>
          <button 
            onClick={() => handleNavClick('pricing')}
            className="group flex items-center gap-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all backdrop-blur-lg"
            id="nav-btn-cta"
          >
            <span>Get Started</span>
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>

        {/* Mobile menu button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white md:hidden cursor-pointer"
          aria-label="Toggle Menu"
          id="nav-mobile-toggle"
        >
          {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile menu container */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.15 }}
            className="border-b border-white/10 bg-slate-950/90 backdrop-blur-md md:hidden"
            id="mobile-menu"
          >
            <div className="space-y-1.5 px-4 pt-2 pb-5">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className="block w-full text-left rounded-lg py-2.5 px-3 text-base font-medium text-slate-300 hover:bg-white/10 hover:text-white cursor-pointer"
                  id={`mobile-nav-link-${item.id}`}
                >
                  {item.label}
                </button>
              ))}
              <div className="mt-4 border-t border-white/10 pt-4 space-y-2.5">
                <button
                  onClick={() => handleNavClick('sandbox')}
                  className="block w-full text-center rounded-lg py-2.5 px-3 text-base font-medium text-slate-300 hover:bg-white/10 hover:text-white cursor-pointer"
                  id="mobile-nav-btn-demo"
                >
                  Try Sandbox
                </button>
                <button
                  onClick={() => handleNavClick('pricing')}
                  className="block w-full text-center rounded-lg bg-gradient-to-r from-blue-500 to-emerald-500 py-2.5 px-3 text-base font-semibold text-white shadow-sm hover:opacity-90 cursor-pointer"
                  id="mobile-nav-btn-cta"
                >
                  Get Started
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
