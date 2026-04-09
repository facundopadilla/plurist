import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight } from "lucide-react";
import {
  fadeUp,
  scaleRotate,
  stagger,
  sectionSlideLeft,
} from "../lib/animations";

const FAQ = [
  {
    q: "What is Plurist?",
    a: "An open-source content creation platform. Write code or use AI to generate it, compose visually on a canvas, and export production-ready assets. Think Google Stitch — but open source, self-hostable, and model-agnostic.",
  },
  {
    q: "What AI models can I use?",
    a: "Any model you want. Plurist supports OpenAI, Anthropic Claude, Google Gemini, and any provider via OpenRouter. You bring your own API keys — we never touch your data.",
  },
  {
    q: "How is this different from Stitch or Banani?",
    a: "Plurist is fully open source (MIT license), self-hostable, and lets you use any AI model. You own your data, run it on your servers, and extend it with plugins. No vendor lock-in, no forced subscriptions.",
  },
  {
    q: "Can I self-host it?",
    a: "Yes. Docker Compose is all you need — PostgreSQL, Redis, MinIO for storage. Everything runs on your infrastructure. A 4-core VPS with 8GB RAM handles it comfortably.",
  },
  {
    q: "What about social media publishing?",
    a: "Publishing is being built as the first installable plugin via Plurist's MCP-based plugin system. It will support LinkedIn, X, and Instagram. Create content in Plurist, publish anywhere through plugins.",
  },
  {
    q: "Is there a cloud version?",
    a: "Coming soon. Managed hosting with included AI credits, team collaboration, and zero setup. Self-hosted remains free forever — the cloud version is for teams who prefer not to manage infrastructure.",
  },
];

export function FaqSection() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section id="faq" className="relative scroll-mt-28 px-6 py-32">
      <div className="absolute left-1/2 top-0 h-px w-2/3 max-w-xl -translate-x-1/2 bg-gradient-to-r from-transparent via-zinc-700/30 to-transparent" />

      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-80px" }}
        variants={sectionSlideLeft}
        className="mx-auto max-w-2xl"
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
            FAQ
          </motion.span>
          <motion.h2
            variants={fadeUp}
            className="mt-4 text-[clamp(1.8rem,4vw,3rem)] font-bold tracking-[-0.03em] text-zinc-50"
          >
            Questions & answers
          </motion.h2>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
          variants={stagger}
          className="mt-14 space-y-2"
        >
          {FAQ.map((item, i) => (
            <motion.div
              key={item.q}
              variants={scaleRotate}
              className="overflow-hidden rounded-xl border border-zinc-800/50 bg-zinc-900/20 backdrop-blur-sm transition-colors hover:border-zinc-700/50"
            >
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="flex w-full items-center justify-between px-5 py-4 text-left"
              >
                <span className="text-[14px] font-medium text-zinc-200 pr-4">
                  {item.q}
                </span>
                <ChevronRight
                  size={14}
                  className={`shrink-0 text-zinc-300 transition-transform duration-300 ${
                    open === i ? "rotate-90" : ""
                  }`}
                />
              </button>
              <AnimatePresence initial={false}>
                {open === i && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                    className="overflow-hidden"
                  >
                    <div className="border-t border-zinc-800/40 px-5 py-4 text-[13px] leading-relaxed text-zinc-300">
                      {item.a}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </motion.div>
      </motion.div>
    </section>
  );
}
