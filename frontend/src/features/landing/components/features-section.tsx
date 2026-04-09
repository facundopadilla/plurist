import { motion } from "framer-motion";
import {
  Code2,
  Layers,
  Sparkles,
  Palette,
  ImageIcon,
  FileCode,
  Link2,
  Terminal,
  Globe,
} from "lucide-react";
import { fadeUp, fadeScale, stagger, sectionSlideUp } from "../lib/animations";
import { cn } from "../lib/cn";

const FEATURES = [
  {
    icon: Sparkles,
    title: "Any AI model",
    description:
      "OpenAI, Claude, Gemini, or anything via OpenRouter. Bring your own keys.",
    span: "sm:col-span-2",
    glow: "from-violet-500/10 to-transparent",
  },
  {
    icon: Layers,
    title: "Multi-variant compare",
    description:
      "4+ providers simultaneously. Side-by-side comparison. Pick the winner.",
    span: "",
    glow: "from-cyan-500/10 to-transparent",
  },
  {
    icon: Code2,
    title: "Code-first",
    description: "Real HTML & CSS you own. Edit directly or let AI generate.",
    span: "",
    glow: "from-emerald-500/10 to-transparent",
  },
  {
    icon: Palette,
    title: "Canvas Studio",
    description:
      "Visual composition with tldraw. Infinite canvas, drag-and-drop layout.",
    span: "sm:col-span-2",
    glow: "from-fuchsia-500/10 to-transparent",
  },
  {
    icon: ImageIcon,
    title: "Design Bank",
    description: "Brand assets, style guides, references. One library.",
    span: "",
    glow: "from-amber-500/10 to-transparent",
  },
  {
    icon: FileCode,
    title: "HTML → Image",
    description: "Pixel-perfect renders at any resolution. Export instantly.",
    span: "",
    glow: "from-sky-500/10 to-transparent",
  },
  {
    icon: Link2,
    title: "Reference URLs",
    description: "Paste any URL as context. AI builds on your references.",
    span: "",
    glow: "from-rose-500/10 to-transparent",
  },
  {
    icon: Terminal,
    title: "Plugin system",
    description: "Extend via MCP. Publishing, Figma sync, and more.",
    span: "",
    tag: "Soon",
    glow: "from-indigo-500/10 to-transparent",
  },
  {
    icon: Globe,
    title: "Self-hostable",
    description: "Docker Compose up. Your servers, your data. Free forever.",
    span: "",
    glow: "from-teal-500/10 to-transparent",
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="relative scroll-mt-28 px-6 py-32">
      <div className="absolute left-1/2 top-0 h-px w-2/3 max-w-xl -translate-x-1/2 bg-gradient-to-r from-transparent via-zinc-700/30 to-transparent" />

      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-80px" }}
        variants={sectionSlideUp}
        className="mx-auto max-w-5xl"
      >
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-120px" }}
          variants={stagger}
          className="text-center"
        >
          <motion.span
            variants={fadeUp}
            className="font-mono text-[11px] uppercase tracking-[0.16em] text-zinc-200"
          >
            Capabilities
          </motion.span>
          <motion.h2
            variants={fadeUp}
            className="mt-4 text-[clamp(1.8rem,4vw,3rem)] font-bold tracking-[-0.03em] text-zinc-50"
          >
            Everything you need.{" "}
            <span className="text-zinc-100">Nothing you don't.</span>
          </motion.h2>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
          variants={stagger}
          className="mt-16 grid grid-cols-1 gap-3 sm:grid-cols-3"
        >
          {FEATURES.map((f) => (
            <motion.div
              key={f.title}
              variants={fadeScale}
              whileHover={{
                y: -3,
                transition: { duration: 0.25, ease: [0.22, 1, 0.36, 1] },
              }}
              className={cn("group relative", f.span)}
            >
              {/* Hover glow */}
              <div
                className={cn(
                  "pointer-events-none absolute -inset-px rounded-2xl bg-gradient-to-b opacity-0 transition-opacity duration-500 group-hover:opacity-100",
                  f.glow,
                )}
              />

              <div className="relative flex h-full flex-col rounded-2xl border border-zinc-800/50 bg-zinc-900/20 p-6 backdrop-blur-sm transition-all duration-300 group-hover:border-zinc-700/50 group-hover:bg-zinc-900/40">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-800/60 text-zinc-300 transition-all duration-300 group-hover:bg-zinc-700/60 group-hover:text-white group-hover:shadow-[0_0_12px_rgba(255,255,255,0.08)]">
                    <f.icon size={16} />
                  </div>
                  <h3 className="text-[14px] font-semibold tracking-[-0.01em] text-zinc-200">
                    {f.title}
                  </h3>
                  {f.tag && (
                    <span className="rounded-md border border-zinc-700/30 bg-zinc-800/40 px-2 py-0.5 font-mono text-[8px] uppercase tracking-[0.18em] text-zinc-200">
                      {f.tag}
                    </span>
                  )}
                </div>
                <p className="mt-3 text-[13px] leading-relaxed text-zinc-300">
                  {f.description}
                </p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </motion.div>
    </section>
  );
}
