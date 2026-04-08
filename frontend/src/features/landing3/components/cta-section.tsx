import { motion } from "framer-motion";
import { ArrowRight, GitHub } from "lucide-react";
import { fadeUp, stagger } from "../lib/animations";
import { ColorWave, ColorWaveButton } from "./cycling-text";

export function CtaSection() {
  return (
    <section className="relative px-6 py-32">
      <div className="absolute left-1/2 top-0 h-px w-2/3 max-w-xl -translate-x-1/2 bg-gradient-to-r from-transparent via-zinc-700/30 to-transparent" />

      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={stagger}
        className="mx-auto max-w-3xl"
      >
        <div className="relative">
          {/* Big ambilight */}
          <div
            className="absolute -inset-16 rounded-[48px] opacity-20 blur-[100px]"
            style={{
              background:
                "conic-gradient(from 0deg, #c084fc22, #22d3ee22, #f472b622, #34d39922, #c084fc22)",
              animation: "l3-spin 20s linear infinite",
            }}
          />

          <div className="relative overflow-hidden rounded-3xl border border-zinc-800/40 bg-zinc-900/30 backdrop-blur-xl">
            {/* Internal dot pattern */}
            <div
              className="pointer-events-none absolute inset-0 opacity-[0.02]"
              style={{
                backgroundImage:
                  "radial-gradient(circle, #fafafa 0.6px, transparent 0.6px)",
                backgroundSize: "16px 16px",
              }}
            />

            <div className="relative px-8 py-24 text-center sm:px-16">
              <motion.span
                variants={fadeUp}
                className="font-mono text-[11px] uppercase tracking-[0.16em] text-zinc-200"
              >
                Get started
              </motion.span>
              <motion.h2
                variants={fadeUp}
                className="mt-5 text-[clamp(2rem,5vw,3.5rem)] font-bold leading-[0.95] tracking-[-0.04em] text-zinc-50"
              >
                Start creating.
                <br />
                <ColorWave>It's free.</ColorWave>
              </motion.h2>
              <motion.p
                variants={fadeUp}
                className="mx-auto mt-5 max-w-sm text-[15px] text-zinc-300"
              >
                Self-host forever or join the managed cloud. Your content, your
                models, your rules.
              </motion.p>
              <motion.div
                variants={fadeUp}
                className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center"
              >
                <a href="/login">
                  <button className="group relative h-12 overflow-hidden rounded-xl bg-zinc-50 px-7 text-[13px] font-semibold text-zinc-900 shadow-[0_0_24px_rgba(250,250,250,0.12)] transition-all duration-300 hover:shadow-[0_0_40px_rgba(250,250,250,0.25)]">
                    <ColorWaveButton className="gap-2">
                      Start for free
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
                >
                  <button className="flex h-12 items-center gap-2 rounded-xl border border-zinc-700/30 bg-transparent px-7 text-[13px] font-semibold text-zinc-300 transition-all duration-300 hover:border-zinc-600/50 hover:bg-zinc-800/30 hover:text-zinc-50">
                    <GitHub size={14} />
                    Star on GitHub
                  </button>
                </a>
              </motion.div>
            </div>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
