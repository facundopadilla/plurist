import { LandingNavbar } from "./components/landing-navbar";
import { HeroSection } from "./components/hero-section";
import { LogosSection } from "./components/logos-section";
import { FeaturesBento } from "./components/features-bento";
import { HowItWorksSection } from "./components/how-it-works-section";
import { AiComparisonSection } from "./components/ai-comparison-section";
import { EditorPreviewSection } from "./components/editor-preview-section";
import { CtaSection } from "./components/cta-section";
import { FooterSection } from "./components/footer-section";

export function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <LandingNavbar />
      <main>
        <HeroSection />
        <LogosSection />
        <FeaturesBento />
        <HowItWorksSection />
        <AiComparisonSection />
        <EditorPreviewSection />
        <CtaSection />
      </main>
      <FooterSection />
    </div>
  );
}
