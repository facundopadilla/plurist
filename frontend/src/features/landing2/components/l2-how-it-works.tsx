import { motion } from "framer-motion";
import { Brush, Sparkles, CheckCircle2, Send } from "lucide-react";
import { fadeUp, stagger, revealUp } from "../lib/animations";

const steps = [
  {
    number: "01",
    icon: Brush,
    title: "Design your post",
    description:
      "Open the canvas editor and create your visual. Use templates, upload assets, or start from scratch.",
    color: "indigo",
  },
  {
    number: "02",
    icon: Sparkles,
    title: "Generate with AI",
    description:
      "Let AI write the caption, hashtags, and copy variations across GPT-4o, Claude, and Gemini.",
    color: "violet",
  },
  {
    number: "03",
    icon: CheckCircle2,
    title: "Review & approve",
    description:
      "Preview how the post looks on each platform. Make edits, pick the best AI variation, and approve.",
    color: "emerald",
  },
  {
    number: "04",
    icon: Send,
    title: "Schedule & publish",
    description:
      "Set a time, pick your platforms, and let Plurist do the rest — or publish instantly.",
    color: "sky",
  },
];

const colorMap: Record<
  string,
  { gradient: string; icon: string; dot: string; line: string }
> = {
  indigo: {
    gradient: "from-indigo-500 to-indigo-600",
    icon: "text-indigo-500",
    dot: "bg-indigo-500",
    line: "bg-indigo-200",
  },
  violet: {
    gradient: "from-violet-500 to-violet-600",
    icon: "text-violet-500",
    dot: "bg-violet-500",
    line: "bg-violet-200",
  },
  emerald: {
    gradient: "from-emerald-500 to-emerald-600",
    icon: "text-emerald-500",
    dot: "bg-emerald-500",
    line: "bg-emerald-200",
  },
  sky: {
    gradient: "from-sky-500 to-sky-600",
    icon: "text-sky-500",
    dot: "bg-sky-500",
    line: "bg-sky-200",
  },
};

export function L2HowItWorks() {
  return (
    <section id="how-it-works" className="bg-neutral-50/60 py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-6">
        {/* Header */}
        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="mb-16 text-center"
        >
          <motion.p
            variants={fadeUp}
            className="mb-3 text-[13px] font-semibold uppercase tracking-[0.18em] text-indigo-500"
          >
            How it works
          </motion.p>
          <motion.h2
            variants={fadeUp}
            className="text-[36px] font-bold leading-[1.1] tracking-[-0.03em] text-neutral-900 sm:text-[44px]"
          >
            From idea to published{" "}
            <span className="bg-gradient-to-r from-indigo-500 to-violet-600 bg-clip-text text-transparent">
              in minutes
            </span>
          </motion.h2>
          <motion.p
            variants={fadeUp}
            className="mx-auto mt-4 max-w-xl text-[17px] text-neutral-500"
          >
            A simple four-step workflow that replaces hours of manual work.
          </motion.p>
        </motion.div>

        {/* Steps */}
        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="relative grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4"
        >
          {/* Connecting line (desktop) */}
          <div className="absolute left-0 right-0 top-[22px] hidden h-px bg-neutral-200 lg:block" />

          {steps.map((step, i) => {
            const colors = colorMap[step.color];
            const Icon = step.icon;

            return (
              <motion.div
                key={step.number}
                variants={revealUp}
                custom={i}
                className="relative flex flex-col gap-4"
              >
                {/* Step number + icon */}
                <div className="relative flex items-center gap-3 lg:flex-col lg:items-start">
                  <div
                    className={`relative z-10 flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-white shadow-md shadow-indigo-100 ${colors.gradient}`}
                  >
                    <Icon size={18} />
                  </div>
                  <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-neutral-400 lg:hidden">
                    Step {step.number}
                  </span>
                </div>

                {/* Step number label (desktop) */}
                <div className="hidden lg:block">
                  <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-neutral-400">
                    Step {step.number}
                  </span>
                </div>

                <div>
                  <h3 className="mb-2 text-[16px] font-semibold text-neutral-900">
                    {step.title}
                  </h3>
                  <p className="text-[14px] leading-relaxed text-neutral-500">
                    {step.description}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
