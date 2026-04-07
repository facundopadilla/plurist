import { useScroll, useSpring, motion } from "framer-motion";
import { L2Navbar } from "./components/l2-navbar";
import { L2HeroSection } from "./components/l2-hero-section";
import { L2LogosSection } from "./components/l2-logos-section";
import { L2FeaturesSection } from "./components/l2-features-section";
import { L2HowItWorks } from "./components/l2-how-it-works";
import { L2AiSection } from "./components/l2-ai-section";
import { L2TestimonialsSection } from "./components/l2-testimonials-section";
import { L2PricingSection } from "./components/l2-pricing-section";
import { L2FaqSection } from "./components/l2-faq-section";
import { L2CtaSection } from "./components/l2-cta-section";
import { L2Footer } from "./components/l2-footer";

export function Landing2Page() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  });

  return (
    <div className="min-h-screen bg-white text-neutral-900 antialiased">
      {/* Scroll progress indicator */}
      <motion.div
        className="fixed left-0 right-0 top-0 z-[100] h-[3px] origin-left"
        style={{
          scaleX,
          background: "linear-gradient(90deg, #6366f1, #8b5cf6, #a78bfa)",
        }}
      />

      <L2Navbar />

      <main>
        <L2HeroSection />
        <L2LogosSection />
        <L2FeaturesSection />
        <L2HowItWorks />
        <L2AiSection />
        <L2TestimonialsSection />
        <L2PricingSection />
        <L2FaqSection />
        <L2CtaSection />
      </main>

      <L2Footer />
    </div>
  );
}
