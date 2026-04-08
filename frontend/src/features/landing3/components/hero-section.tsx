import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowRight, GitHub } from "lucide-react";
import { fadeUp, stagger } from "../lib/animations";
import { CyclingText, ColorWaveButton } from "./cycling-text";

export function HeroSection() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const bgY = useTransform(scrollYProgress, [0, 1], [0, -150]);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.6], [1, 0]);
  const contentScale = useTransform(scrollYProgress, [0, 0.6], [1, 0.92]);
  const contentY = useTransform(scrollYProgress, [0, 0.6], [0, 60]);

  const proofItems = ["BYOM", "Canvas Studio", "MCP plugins", "Self-hosted"];

  return (
    <section
      ref={ref}
      className="relative flex min-h-[100dvh] flex-col items-center justify-center overflow-hidden pt-20"
    >
      {/* ── Animated background blobs ─────────────────────── */}
      <motion.div
        className="pointer-events-none absolute inset-0"
        style={{ y: bgY }}
      >
        <div
          className="absolute left-1/2 top-[28%] h-[800px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-[0.07] blur-[180px]"
          style={{
            background:
              "radial-gradient(circle, #a78bfa 0%, #22d3ee 50%, transparent 70%)",
            animation: "float-slow 12s ease-in-out infinite",
          }}
        />
        <div
          className="absolute left-[25%] top-[55%] h-[500px] w-[500px] rounded-full opacity-[0.05] blur-[140px]"
          style={{
            background:
              "radial-gradient(circle, #f472b6 0%, #c084fc 60%, transparent 80%)",
            animation: "float-slow 16s ease-in-out infinite reverse",
          }}
        />
        <div
          className="absolute right-[15%] top-[30%] h-[400px] w-[400px] rounded-full opacity-[0.04] blur-[120px]"
          style={{
            background:
              "radial-gradient(circle, #34d399 0%, #22d3ee 60%, transparent 80%)",
            animation: "float-slow 14s ease-in-out infinite 3s",
          }}
        />
      </motion.div>

      {/* Dot grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage:
            "radial-gradient(circle, #fafafa 0.8px, transparent 0.8px)",
          backgroundSize: "28px 28px",
        }}
      />

      {/* Radial vignette */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_40%,transparent_30%,#09090b_100%)]" />

      {/* Content */}
      <motion.div
        style={{ opacity: contentOpacity, scale: contentScale, y: contentY }}
        className="relative z-10 mx-auto max-w-5xl px-6 text-center"
      >
        <motion.div initial="hidden" animate="visible" variants={stagger}>
          {/* Headline — "Create content with" white, cycling colored word */}
          <motion.h1
            variants={fadeUp}
            className="text-[clamp(3rem,8.5vw,7rem)] font-extrabold leading-[0.88] tracking-[-0.05em]"
          >
            <span className="block text-zinc-50">Create content</span>
            <span className="block mt-1 text-zinc-50">
              with{" "}
              <CyclingText words={["code.", "AI.", "text."]} interval={2200} />
            </span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            variants={fadeUp}
            className="mx-auto mt-8 max-w-2xl text-[16px] leading-[1.8] text-zinc-200 sm:text-[17px]"
          >
            The open-source alternative to Google Stitch and Banani. Generate
            with any AI model. Compose visually. Export production-ready assets.
          </motion.p>

          <motion.div
            variants={fadeUp}
            className="mt-8 flex flex-wrap items-center justify-center gap-x-5 gap-y-3"
          >
            {proofItems.map((item) => (
              <div key={item} className="flex items-center gap-2 text-zinc-100">
                <span className="h-1.5 w-1.5 rounded-full bg-white/70" />
                <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-zinc-200 sm:text-[11px]">
                  {item}
                </span>
              </div>
            ))}
          </motion.div>

          {/* CTA buttons — "Get started free" hover has color wave */}
          <motion.div
            variants={fadeUp}
            className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center"
          >
            <a href="/login" className="w-full sm:w-auto">
              <button className="group relative h-12 w-full overflow-hidden rounded-xl bg-zinc-50 px-7 text-[13px] font-semibold text-zinc-900 shadow-[0_0_24px_rgba(250,250,250,0.12)] transition-all duration-300 hover:shadow-[0_0_40px_rgba(250,250,250,0.22)] sm:w-auto">
                <ColorWaveButton className="gap-2">
                  Get started free
                </ColorWaveButton>
                <ArrowRight
                  size={14}
                  className="ml-1 inline-block transition-transform duration-300 group-hover:translate-x-1"
                />
              </button>
            </a>
            <a
              href="https://github.com/facuolidev/plurist"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto"
            >
              <button className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-zinc-700/30 bg-zinc-900/20 px-7 text-[13px] font-semibold text-zinc-300 backdrop-blur-sm transition-all duration-300 hover:border-zinc-600/50 hover:bg-zinc-800/30 hover:text-zinc-50 sm:w-auto">
                <GitHub size={14} />
                Star on GitHub
              </button>
            </a>
          </motion.div>

          {/* Terminal card */}
          <motion.div variants={fadeUp} className="mt-16 sm:mt-20">
            <div className="relative mx-auto max-w-xl sm:max-w-2xl">
              {/* Spinning ambilight */}
              <div
                className="absolute -inset-6 rounded-3xl opacity-30 blur-[60px]"
                style={{
                  background:
                    "conic-gradient(from 180deg, #c084fc33, #22d3ee33, #f472b633, #c084fc33)",
                  animation: "l3-spin 10s linear infinite",
                }}
              />

              <div className="relative overflow-hidden rounded-2xl border border-zinc-700/30 bg-[#0c0c0e]/80 shadow-[0_30px_80px_rgba(0,0,0,0.6)] backdrop-blur-xl">
                {/* Title bar */}
                <div className="flex items-center gap-2 border-b border-zinc-800/60 px-4 py-3">
                  <div className="flex gap-1.5">
                    <div className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]/80" />
                    <div className="h-2.5 w-2.5 rounded-full bg-[#febc2e]/80" />
                    <div className="h-2.5 w-2.5 rounded-full bg-[#28c840]/80" />
                  </div>
                  <span className="ml-3 font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-300">
                    terminal
                  </span>
                </div>
                {/* Code lines */}
                <div className="px-5 py-5 font-mono text-[12px] leading-[2]">
                  <div className="flex gap-2">
                    <span className="text-zinc-300 select-none shrink-0">
                      ❯
                    </span>
                    <div>
                      <span className="text-zinc-300">git clone </span>
                      <span className="text-cyan-400/70">
                        github.com/plurist/plurist
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-zinc-300 select-none shrink-0">
                      ❯
                    </span>
                    <div>
                      <span className="text-zinc-300">
                        cd plurist && docker compose up -d
                      </span>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-emerald-400">✓</span>
                    <span className="text-zinc-300">Running at </span>
                    <span className="rounded-md bg-zinc-800/60 px-2 py-0.5 text-[12px] text-zinc-200">
                      localhost:3000
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </motion.div>
    </section>
  );
}
