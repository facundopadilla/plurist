import { motion, useScroll } from "framer-motion";
import { LandingNavbar } from "./components/landing-navbar";
import { HeroSection } from "./components/hero-section";
import { LogosSection } from "./components/logos-section";
import { FeaturesBento } from "./components/features-bento";
import { HowItWorksSection } from "./components/how-it-works-section";
import { TestimonialsSection } from "./components/testimonials-section";
import { AiComparisonSection } from "./components/ai-comparison-section";
import { EditorPreviewSection } from "./components/editor-preview-section";
import { FaqSection } from "./components/faq-section";
import { PricingSection } from "./components/pricing-section";
import { CtaSection } from "./components/cta-section";
import { FooterSection } from "./components/footer-section";

export function LandingPage() {
  const { scrollYProgress } = useScroll();

  return (
    <div className="min-h-screen bg-brutal-bg text-black antialiased">
      {/* Scroll progress */}
      <motion.div
        className="fixed top-0 left-0 right-0 h-[3px] bg-black z-[60] origin-left"
        style={{ scaleX: scrollYProgress }}
      />

      <LandingNavbar />
      <main>
        <HeroSection />
        <LogosSection />
        <FeaturesBento />
        <HowItWorksSection />
        <TestimonialsSection />
        <AiComparisonSection />
        <EditorPreviewSection />
        <FaqSection />
        <PricingSection />
        <CtaSection />
      </main>
      <FooterSection />
    </div>
  );
}
