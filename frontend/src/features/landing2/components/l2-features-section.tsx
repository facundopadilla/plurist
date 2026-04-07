import { motion } from "framer-motion";
import { Brush, Brain, Calendar, BarChart3, Image, Clock } from "lucide-react";
import { fadeUp, stagger, revealUp } from "../lib/animations";

const features = [
  {
    icon: Brush,
    title: "Visual Canvas Editor",
    description:
      "Design stunning social media posts with a drag-and-drop canvas. Full creative control — no design skills required.",
    color: "indigo",
    span: "lg:col-span-2",
  },
  {
    icon: Brain,
    title: "Multi-Model AI",
    description:
      "Generate content with GPT-4o, Claude, or Gemini. Compare outputs side by side and pick the best one.",
    color: "violet",
    span: "",
  },
  {
    icon: Clock,
    title: "Smart Scheduling",
    description:
      "Queue posts for every platform and let Plurist publish at the perfect time.",
    color: "sky",
    span: "",
  },
  {
    icon: Calendar,
    title: "Content Calendar",
    description:
      "See your entire content strategy at a glance. Plan weeks ahead with a visual calendar view.",
    color: "emerald",
    span: "",
  },
  {
    icon: BarChart3,
    title: "Analytics Dashboard",
    description:
      "Track reach, engagement, and growth across all platforms in one unified dashboard.",
    color: "amber",
    span: "",
  },
  {
    icon: Image,
    title: "Design Bank",
    description:
      "Store brand assets, templates, and reusable elements. Keep every post on-brand, every time.",
    color: "rose",
    span: "lg:col-span-2",
  },
];

const colorMap: Record<string, { bg: string; icon: string; ring: string }> = {
  indigo: {
    bg: "bg-indigo-50",
    icon: "text-indigo-500",
    ring: "ring-indigo-100",
  },
  violet: {
    bg: "bg-violet-50",
    icon: "text-violet-500",
    ring: "ring-violet-100",
  },
  sky: { bg: "bg-sky-50", icon: "text-sky-500", ring: "ring-sky-100" },
  emerald: {
    bg: "bg-emerald-50",
    icon: "text-emerald-500",
    ring: "ring-emerald-100",
  },
  amber: { bg: "bg-amber-50", icon: "text-amber-500", ring: "ring-amber-100" },
  rose: { bg: "bg-rose-50", icon: "text-rose-500", ring: "ring-rose-100" },
};

export function L2FeaturesSection() {
  return (
    <section id="features" className="py-24 sm:py-32">
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
            Everything you need
          </motion.p>
          <motion.h2
            variants={fadeUp}
            className="text-[36px] font-bold leading-[1.1] tracking-[-0.03em] text-neutral-900 sm:text-[44px]"
          >
            One platform,{" "}
            <span className="bg-gradient-to-r from-indigo-500 to-violet-600 bg-clip-text text-transparent">
              every channel
            </span>
          </motion.h2>
          <motion.p
            variants={fadeUp}
            className="mx-auto mt-4 max-w-2xl text-[17px] text-neutral-500"
          >
            From first idea to published post, Plurist handles every step of
            your social media workflow.
          </motion.p>
        </motion.div>

        {/* Bento grid */}
        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4"
        >
          {features.map((feature) => {
            const colors = colorMap[feature.color];
            const Icon = feature.icon;

            return (
              <motion.div
                key={feature.title}
                variants={revealUp}
                className={`group relative overflow-hidden rounded-2xl border border-neutral-100 bg-white p-6 shadow-sm transition-shadow hover:shadow-md ${feature.span}`}
              >
                <div
                  className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl ring-1 ${colors.bg} ${colors.ring}`}
                >
                  <Icon size={20} className={colors.icon} />
                </div>
                <h3 className="mb-2 text-[16px] font-semibold text-neutral-900">
                  {feature.title}
                </h3>
                <p className="text-[14px] leading-relaxed text-neutral-500">
                  {feature.description}
                </p>

                {/* Subtle hover gradient */}
                <div
                  className={`pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 ${colors.bg}`}
                  style={{ opacity: 0 }}
                />
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
