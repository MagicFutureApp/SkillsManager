import React from 'react';
import Header from './components/header';
import Hero from './components/hero';
import Features from './components/features';
import InteractiveSandbox from './components/interactive-sandbox';
import Pricing from './components/pricing';
import Footer from './components/footer';

export default function App() {
  // Navigation scrolling logic
  const handleScrollToSection = (id: string) => {
    if (id === 'hero') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 font-sans selection:bg-zinc-900 selection:text-zinc-50">
      {/* Dynamic Header */}
      <Header onScrollTo={handleScrollToSection} />

      <main>
        {/* Hero Section */}
        <Hero onScrollToSandbox={() => handleScrollToSection('sandbox')} />

        {/* Bento Grid Feature Highlight */}
        <Features />

        {/* Live Functional Sandbox App */}
        <InteractiveSandbox />

        {/* Pricing tiers */}
        <Pricing />
      </main>

      {/* Structured Footer */}
      <Footer onScrollToTop={() => handleScrollToSection('hero')} />
    </div>
  );
}
