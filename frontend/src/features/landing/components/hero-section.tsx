"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import { ease } from "../lib/animations";

export function HeroSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });
  const mockupY = useTransform(scrollYProgress, [0, 1], [0, -60]);
  const mockupOpacity = useTransform(scrollYProgress, [0, 0.6], [1, 0.3]);

  return (
    <section
      ref={sectionRef}
      className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden px-6 pt-16 bg-brutal-bg brutal-grid-bg"
    >
      {/* Content */}
      <div className="relative z-10 max-w-4xl mx-auto text-center">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease }}
        >
          <span className="inline-flex items-center gap-1.5 bg-brutal-yellow border-2 border-black shadow-brutal-sm rounded px-3 py-1 text-xs font-bold uppercase tracking-wider text-black">
            <Sparkles className="h-3 w-3" />
            Collaborative UI Studio
          </span>
        </motion.div>

        {/* Headline */}
        <h1 className="mt-8 font-display font-extrabold text-[56px] sm:text-[80px] lg:text-[96px] xl:text-[112px] leading-[0.9] tracking-[-0.04em]">
          <motion.span
            className="block text-black"
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1, ease }}
          >
            Design. Generate.
          </motion.span>
          <motion.span
            className="block text-[#555]"
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.22, ease }}
          >
            Publish everywhere.
          </motion.span>
        </h1>

        {/* Subtitle */}
        <motion.p
          className="mt-8 text-base sm:text-lg text-[#555] max-w-xl mx-auto leading-relaxed font-medium"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.35, ease }}
        >
          Build websites, social posts, and visual content — all powered by AI.
          Design visually, edit code, collaborate in real-time.
        </motion.p>

        {/* Prompt bar */}
        <motion.div
          className="mt-10 max-w-2xl mx-auto"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.45, ease }}
        >
          <div className="flex items-center gap-3 bg-white border-2 border-black shadow-brutal-lg rounded-xl px-5 py-4">
            <Sparkles className="h-4 w-4 text-[#555] shrink-0" />
            <span className="text-sm text-[#888] flex-1 text-left font-medium">
              Describe what you want to create...
            </span>
            <a
              href="/login"
              className="brutal-btn bg-brutal-yellow text-black rounded-lg px-4 h-8 text-xs shrink-0 inline-flex items-center gap-1.5"
            >
              Generate
              <ArrowRight className="h-3 w-3" />
            </a>
          </div>
        </motion.div>

        {/* Secondary CTA */}
        <motion.div
          className="mt-5 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.6, ease }}
        >
          <a
            href="#how-it-works"
            className="text-sm text-[#555] hover:text-black font-semibold underline underline-offset-4 transition-colors duration-150"
          >
            See how it works →
          </a>
        </motion.div>

        {/* Product mockup */}
        <motion.div
          className="mt-20 relative"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.65, ease }}
          style={{ y: mockupY, opacity: mockupOpacity }}
        >
          <div
            className="relative rounded-xl border-3 border-black bg-white overflow-hidden"
            style={{ boxShadow: "12px 12px 0 0 #000" }}
          >
            {/* Title bar */}
            <div className="flex items-center gap-2 px-4 py-3 border-b-2 border-black bg-brutal-yellow">
              <span className="h-3 w-3 rounded-full bg-black" />
              <span className="h-3 w-3 rounded-full bg-black opacity-40" />
              <span className="h-3 w-3 rounded-full bg-black opacity-20" />
              <span className="ml-4 text-[11px] text-black font-bold tracking-wide uppercase">
                plurist — canvas studio
              </span>
            </div>

            {/* Editor body */}
            <div className="flex h-[320px] sm:h-[420px]">
              {/* Left — AI chat */}
              <div className="hidden sm:flex w-64 border-r-2 border-black flex-col bg-brutal-pastel-blue">
                <div className="px-4 py-3 border-b-2 border-black flex items-center gap-2 bg-white">
                  <div className="h-2 w-2 rounded-full bg-black" />
                  <span className="text-[11px] font-bold text-black tracking-wide uppercase">
                    AI Assistant
                  </span>
                </div>
                <div className="flex-1 p-3 space-y-2.5 overflow-hidden">
                  <div className="flex justify-end">
                    <div className="bg-white border-2 border-black rounded-lg rounded-tr-none px-3 py-2 text-[11px] text-black font-medium max-w-[85%] shadow-brutal-sm">
                      Create a minimal launch post with our brand colors
                    </div>
                  </div>
                  <div className="flex justify-start">
                    <div className="bg-brutal-yellow border-2 border-black rounded-lg rounded-tl-none px-3 py-2 text-[11px] text-black font-medium max-w-[85%] shadow-brutal-sm">
                      Done! Clean layout with gradient accent and bold CTA.
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <div className="bg-white border-2 border-black rounded-lg rounded-tr-none px-3 py-2 text-[11px] text-black font-medium max-w-[85%] shadow-brutal-sm">
                      Now generate a website header version
                    </div>
                  </div>
                  <div className="flex justify-start">
                    <div className="bg-brutal-yellow border-2 border-black rounded-lg rounded-tl-none px-3 py-2 text-[11px] text-black font-medium max-w-[85%] shadow-brutal-sm">
                      Here's a responsive hero with the same visual language...
                    </div>
                  </div>
                </div>
                <div className="px-3 py-3 border-t-2 border-black bg-white">
                  <div className="rounded border-2 border-black px-3 py-2 text-[11px] text-[#888] font-medium">
                    Ask AI anything...
                  </div>
                </div>
              </div>

              {/* Center — canvas */}
              <div className="flex-1 p-4 sm:p-5 flex flex-col bg-white">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[10px] text-black font-bold px-2 py-1 rounded border-2 border-black bg-brutal-pastel-green">
                    1080 × 1080
                  </span>
                  <span className="text-[10px] text-black font-bold px-2 py-1 rounded border-2 border-black bg-brutal-pastel-yellow">
                    Slide 1/3
                  </span>
                  <span className="ml-auto text-[10px] text-black font-bold px-2 py-1 rounded border-2 border-black bg-brutal-pastel-purple">
                    &lt;/&gt; Code
                  </span>
                </div>

                <div className="flex-1 rounded border-2 border-black bg-brutal-bg brutal-grid-bg flex items-center justify-center">
                  <div className="flex flex-col items-center gap-2.5">
                    <div className="h-10 w-10 rounded-lg bg-brutal-yellow border-2 border-black flex items-center justify-center shadow-brutal-sm">
                      <Sparkles className="h-5 w-5 text-black" />
                    </div>
                    <div className="h-2.5 w-32 rounded-sm bg-black" />
                    <div className="h-1.5 w-40 rounded-sm bg-black opacity-30" />
                    <div className="h-1.5 w-28 rounded-sm bg-black opacity-20" />
                    <div className="mt-2 h-7 w-20 rounded border-2 border-black bg-brutal-yellow shadow-brutal-sm" />
                  </div>
                </div>
              </div>

              {/* Right — slides */}
              <div className="hidden lg:flex w-16 border-l-2 border-black flex-col p-2 gap-1.5 bg-brutal-bg">
                <span className="text-[9px] text-black font-bold px-1 mb-1 tracking-wide uppercase">
                  Slides
                </span>
                <div className="rounded border-2 border-black bg-brutal-yellow aspect-square shadow-brutal-sm" />
                <div className="rounded border-2 border-black bg-white aspect-square opacity-50" />
                <div className="rounded border-2 border-black bg-white aspect-square opacity-25" />
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-brutal-bg to-transparent pointer-events-none" />
    </section>
  );
}
