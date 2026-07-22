import React from "react";
import Header from "./components/header";
import Hero from "./components/hero";
import Features from "./components/features";
import InteractiveSandbox from "./components/interactive-sandbox";
import Pricing from "./components/pricing";
import Footer from "./components/footer";
import { useReleaseManifest } from "./hooks/use-release-manifest";
import { getReleaseDownloadUrl } from "./lib/release-manifest";

export default function App() {
  const release = useReleaseManifest();
  const downloadUrl = getReleaseDownloadUrl(release.manifest);

  // Navigation scrolling logic
  const handleScrollToSection = (id: string) => {
    if (id === "hero") {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 font-sans selection:bg-zinc-900 selection:text-zinc-50">
      {/* Dynamic Header */}
      <Header onScrollTo={handleScrollToSection} release={release} downloadUrl={downloadUrl} />

      <main>
        {/* Hero Section */}
        <Hero
          onScrollToSandbox={() => handleScrollToSection("sandbox")}
          downloadUrl={downloadUrl}
        />

        {/* Bento Grid Feature Highlight */}
        <Features />

        {/* Live Functional Sandbox App */}
        <InteractiveSandbox />

        {/* Pricing tiers */}
        <Pricing />
      </main>

      {/* Structured Footer */}
      <Footer onScrollToTop={() => handleScrollToSection("hero")} release={release} />
    </div>
  );
}
