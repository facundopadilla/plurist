import { motion } from "framer-motion";
import { blurIn, staggerSlow, sectionBlurIn } from "../lib/animations";
import { ColorWave } from "./cycling-text";

const STEPS = [
  {
    num: "01",
    title: "Describe",
    description:
      "Write a brief. Paste a reference URL. Upload brand assets. Tell Plurist what you want to create.",
  },
  {
    num: "02",
    title: "Generate & compare",
    description:
      "AI generates multiple variants across providers. Compare outputs side-by-side. Pick the best.",
  },
  {
    num: "03",
    title: "Refine & export",
    description:
      "Edit the code directly, compose on the visual canvas, render to pixel-perfect images. Done.",
  },
];

export function WorkflowSection() {
  return (
    <section className="relative px-6 py-32">
      <div className="absolute left-1/2 top-0 h-px w-2/3 max-w-xl -translate-x-1/2 bg-gradient-to-r from-transparent via-zinc-700/30 to-transparent" />

      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-80px" }}
        variants={sectionBlurIn}
        className="mx-auto max-w-4xl"
      >
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-120px" }}
          variants={staggerSlow}
          className="text-center"
        >
          <motion.span
            variants={blurIn}
            className="font-mono text-[11px] uppercase tracking-[0.16em] text-zinc-200"
          >
            Workflow
          </motion.span>
          <motion.h2
            variants={blurIn}
            className="mt-4 text-[clamp(1.8rem,4vw,3rem)] font-bold tracking-[-0.03em] text-zinc-50"
          >
            Three steps. <ColorWave>Zero friction.</ColorWave>
          </motion.h2>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
          variants={staggerSlow}
          className="mt-20 grid gap-12 sm:grid-cols-3 sm:gap-6"
        >
          {STEPS.map((s, i) => (
            <motion.div
              key={s.num}
              variants={blurIn}
              className="group relative"
            >
              {/* Ghost number — visible, not clipped */}
              <div className="mb-4 font-mono text-[64px] font-bold leading-none tracking-[-0.04em] text-white/35 transition-colors duration-500 group-hover:text-white/55 select-none sm:text-[80px]">
                {s.num}
              </div>

              {/* Connecting dots between steps on desktop */}
              {i < STEPS.length - 1 && (
                <div
                  className="absolute right-0 top-10 hidden items-center sm:flex"
                  style={{ transform: "translateX(50%)" }}
                >
                  <div className="h-px w-4 bg-white/18" />
                  <div className="h-1.5 w-1.5 rounded-full bg-white/28" />
                </div>
              )}

              <h3 className="text-lg font-semibold tracking-[-0.01em] text-zinc-100">
                {s.title}
              </h3>
              <p className="mt-3 text-[14px] leading-relaxed text-zinc-300">
                {s.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </motion.div>
    </section>
  );
}
