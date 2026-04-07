import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ChevronRight } from "lucide-react";
import { fadeUp, stagger, slideFromRight } from "../lib/animations";

const models = [
  {
    key: "gpt4",
    name: "GPT-4o",
    logo: "⚡",
    color: "from-emerald-400 to-teal-500",
    output:
      "🚀 Just hit 10,000 posts on Plurist — and we're just getting started! Huge shoutout to every creator who trusted us with their content strategy. Your growth is our mission. Here's to the next milestone! 💪 #SocialMedia #Growth #ContentCreation",
    metrics: { engagement: "4.2%", reach: "12.4K", tone: "Energetic" },
  },
  {
    key: "claude",
    name: "Claude",
    logo: "✦",
    color: "from-violet-400 to-purple-500",
    output:
      "A milestone worth celebrating: 10,000 posts created. But more than the number, we're proud of the stories behind each one — the brands found, the audiences engaged, the messages delivered. Thank you for building with Plurist. The best is still ahead.",
    metrics: { engagement: "3.8%", reach: "9.7K", tone: "Thoughtful" },
  },
  {
    key: "gemini",
    name: "Gemini",
    logo: "◆",
    color: "from-blue-400 to-indigo-500",
    output:
      "10,000 posts and counting! 🎉 What started as a simple idea — make social media creation effortless — has helped hundreds of teams share their stories with the world. We're grateful, we're motivated, and we're ready for the next 10K. Are you?",
    metrics: { engagement: "3.5%", reach: "8.9K", tone: "Conversational" },
  },
];

export function L2AiSection() {
  const [activeModel, setActiveModel] = useState(models[0]);

  return (
    <section id="ai" className="py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-16">
          {/* Left: text */}
          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            <motion.p
              variants={fadeUp}
              className="mb-3 text-[13px] font-semibold uppercase tracking-[0.18em] text-indigo-500"
            >
              Multi-model AI
            </motion.p>
            <motion.h2
              variants={fadeUp}
              className="mb-5 text-[36px] font-bold leading-[1.1] tracking-[-0.03em] text-neutral-900 sm:text-[44px]"
            >
              Pick the AI that
              <br />
              <span className="bg-gradient-to-r from-indigo-500 to-violet-600 bg-clip-text text-transparent">
                fits your voice
              </span>
            </motion.h2>
            <motion.p
              variants={fadeUp}
              className="mb-8 text-[17px] leading-relaxed text-neutral-500"
            >
              Generate content with GPT-4o, Claude, or Gemini simultaneously.
              Compare tone, length, and style — then pick the best for your
              brand.
            </motion.p>

            {/* Model selector */}
            <motion.div variants={fadeUp} className="flex flex-col gap-2">
              {models.map((model) => (
                <button
                  key={model.key}
                  onClick={() => setActiveModel(model)}
                  className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all ${
                    activeModel.key === model.key
                      ? "border-indigo-200 bg-indigo-50 shadow-sm"
                      : "border-neutral-100 bg-white hover:border-neutral-200 hover:bg-neutral-50"
                  }`}
                >
                  <div
                    className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br text-white text-[16px] ${model.color}`}
                  >
                    {model.logo}
                  </div>
                  <div className="flex-1">
                    <div className="text-[14px] font-semibold text-neutral-900">
                      {model.name}
                    </div>
                    <div className="text-[12px] text-neutral-500">
                      {model.metrics.tone} tone · {model.metrics.engagement}{" "}
                      engagement
                    </div>
                  </div>
                  <ChevronRight
                    size={16}
                    className={`flex-shrink-0 transition-colors ${
                      activeModel.key === model.key
                        ? "text-indigo-500"
                        : "text-neutral-300"
                    }`}
                  />
                </button>
              ))}
            </motion.div>
          </motion.div>

          {/* Right: AI output demo */}
          <motion.div
            variants={slideFromRight}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="relative"
          >
            <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-xl shadow-neutral-100">
              {/* Demo header */}
              <div className="flex items-center justify-between border-b border-neutral-100 bg-neutral-50 px-5 py-4">
                <div className="flex items-center gap-2">
                  <Sparkles size={14} className="text-indigo-500" />
                  <span className="text-[13px] font-semibold text-neutral-700">
                    AI Output
                  </span>
                </div>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeModel.key}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.2 }}
                    className={`flex items-center gap-1.5 rounded-full bg-gradient-to-r px-3 py-1 text-[11px] font-semibold text-white ${activeModel.color}`}
                  >
                    <span>{activeModel.logo}</span>
                    {activeModel.name}
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Content area */}
              <div className="p-5">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeModel.key}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.25 }}
                    className="min-h-[120px]"
                  >
                    <p className="text-[14px] leading-relaxed text-neutral-700">
                      {activeModel.output}
                    </p>
                  </motion.div>
                </AnimatePresence>

                {/* Metrics */}
                <div className="mt-5 grid grid-cols-3 gap-3 border-t border-neutral-100 pt-4">
                  <div className="text-center">
                    <div className="text-[16px] font-bold text-neutral-900">
                      {activeModel.metrics.engagement}
                    </div>
                    <div className="text-[11px] text-neutral-500">
                      Avg engagement
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-[16px] font-bold text-neutral-900">
                      {activeModel.metrics.reach}
                    </div>
                    <div className="text-[11px] text-neutral-500">
                      Est. reach
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-[16px] font-bold text-neutral-900">
                      {activeModel.metrics.tone}
                    </div>
                    <div className="text-[11px] text-neutral-500">Tone</div>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="mt-4 flex gap-2">
                  {["Use this", "Edit", "More variations"].map((action, i) => (
                    <button
                      key={action}
                      className={`rounded-lg px-3 py-1.5 text-[12px] font-medium transition-colors ${
                        i === 0
                          ? "bg-indigo-500 text-white hover:bg-indigo-600"
                          : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                      }`}
                    >
                      {action}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Decorative glow */}
            <div className="pointer-events-none absolute -inset-4 -z-10 rounded-3xl bg-gradient-to-br from-indigo-100/50 to-violet-100/50 blur-2xl" />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
