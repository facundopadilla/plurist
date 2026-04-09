import { motion, useScroll, useSpring } from "framer-motion";
import { Navbar } from "./components/navbar";
import { HeroSection } from "./components/hero-section";
import { FeaturesSection } from "./components/features-section";
import { EditorSection } from "./components/editor-section";
import { WorkflowSection } from "./components/workflow-section";
import { ComparisonSection } from "./components/comparison-section";
import { FaqSection } from "./components/faq-section";
import { CtaSection } from "./components/cta-section";
import { Footer } from "./components/footer";

export function LandingPage() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 200,
    damping: 50,
    restDelta: 0.001,
  });
  const ambientY = useSpring(scrollYProgress, {
    stiffness: 90,
    damping: 22,
    restDelta: 0.001,
  });

  return (
    <div
      className="relative min-h-screen bg-[#09090b] text-zinc-50 [scroll-behavior:smooth]"
      style={{ colorScheme: "dark" }}
    >
      {/* Scroll progress bar */}
      <motion.div
        className="fixed left-0 right-0 top-0 z-[60] h-[2px] origin-left bg-gradient-to-r from-violet-500 via-cyan-400 to-fuchsia-500"
        style={{ scaleX }}
      />

      {/* Film grain overlay */}
      <div className="pointer-events-none fixed inset-0 z-[55] mix-blend-overlay opacity-[0.03]">
        <svg width="100%" height="100%">
          <filter id="grain3">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.8"
              numOctaves="4"
              stitchTiles="stitch"
            />
            <feColorMatrix type="saturate" values="0" />
          </filter>
          <rect width="100%" height="100%" filter="url(#grain3)" />
        </svg>
      </div>

      {/* Ambient transition layer */}
      <motion.div
        className="pointer-events-none fixed inset-0 z-[1] overflow-hidden"
        style={{ y: ambientY }}
      >
        <motion.div
          className="absolute left-[8%] top-[14%] h-[28rem] w-[28rem] rounded-full blur-[120px]"
          style={{
            background:
              "radial-gradient(circle, rgba(244,244,245,0.07) 0%, rgba(244,244,245,0.02) 36%, transparent 72%)",
            opacity: 0.6,
            scale: scaleX,
          }}
        />
        <motion.div
          className="absolute right-[6%] top-[42%] h-[34rem] w-[34rem] rounded-full blur-[140px]"
          style={{
            background:
              "radial-gradient(circle, rgba(168,85,247,0.08) 0%, rgba(244,114,182,0.04) 40%, transparent 72%)",
            opacity: 0.45,
          }}
        />
        <motion.div
          className="absolute bottom-[-8rem] left-1/2 h-[30rem] w-[30rem] -translate-x-1/2 rounded-full blur-[130px]"
          style={{
            background:
              "radial-gradient(circle, rgba(34,211,238,0.06) 0%, rgba(250,250,250,0.03) 42%, transparent 72%)",
            opacity: 0.55,
          }}
        />
      </motion.div>

      <Navbar />

      <main className="relative z-10">
        <HeroSection />
        <FeaturesSection />
        <EditorSection />
        <WorkflowSection />
        <ComparisonSection />
        <FaqSection />
        <CtaSection />
      </main>

      <Footer />

      {/* Global keyframes for marketing landing */}
      <style>{`
        @keyframes color-wave {
          0% { background-position: 0% 50%; }
          100% { background-position: 200% 50%; }
        }
        @keyframes float-slow {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -20px) scale(1.05); }
          66% { transform: translate(-20px, 15px) scale(0.95); }
        }
        @keyframes l3-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
