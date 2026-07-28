import React from "react";

import Footer from "../../../components/footer";
import Header from "../../../components/header";
import { useDownloadPlatform } from "../../../hooks/use-download-platform";
import { useReleaseManifest } from "../../../hooks/use-release-manifest";
import Features from "./features";
import Hero from "./hero";
import InteractiveSandbox from "./interactive-sandbox";
import Pricing from "./pricing";

export default function IndexPage() {
  const release = useReleaseManifest();
  const [downloadPlatform, setDownloadPlatform] = useDownloadPlatform();

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
      <Header
        onScrollTo={handleScrollToSection}
        release={release}
        downloadPlatform={downloadPlatform}
        onDownloadPlatformChange={setDownloadPlatform}
      />

      <main>
        {/* Hero Section */}
        <Hero
          onScrollToSandbox={() => handleScrollToSection("sandbox")}
          release={release}
          downloadPlatform={downloadPlatform}
          onDownloadPlatformChange={setDownloadPlatform}
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
