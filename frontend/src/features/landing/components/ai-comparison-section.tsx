"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { ease, fadeScale, staggerContainer } from "../lib/animations";

const PROVIDERS = [
  {
    name: "OpenAI",
    color: "#10a37f",
    lines: [100, 85, 92, 65, 45, 78],
    selected: false,
    bg: "#d5eaff",
  },
  {
    name: "Anthropic",
    color: "#d97706",
    lines: [95, 100, 70, 88, 50, 62],
    selected: true,
    bg: "#fddd9a",
  },
  {
    name: "Gemini",
    color: "#4285f4",
    lines: [100, 78, 85, 55, 90, 42],
    selected: false,
    bg: "#c8daaa",
  },
] as const;

export function AiComparisonSection() {
  return (
    <section
      id="ai-comparison"
      className="py-24 sm:py-32 bg-brutal-bg border-b-2 border-black"
    >
      <div className="max-w-6xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, ease }}
          className="text-center"
        >
          <p className="font-mono text-xs uppercase tracking-wider text-black font-bold mb-2">
            Multi-AI comparison
          </p>
          <h2 className="font-display font-extrabold text-[40px] sm:text-[56px] lg:text-[64px] leading-[1] tracking-[-0.04em] text-black">
            Not locked into <span className="text-[#555]">one model.</span>
          </h2>
          <p className="mt-4 text-base text-[#555] max-w-xl mx-auto leading-relaxed font-medium">
            Run the same prompt through OpenAI, Anthropic, and Gemini
            simultaneously. Compare outputs side by side. Pick the best.
          </p>
        </motion.div>

        <motion.div
          className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto mt-12"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
        >
          {PROVIDERS.map((provider) => (
            <motion.div
              key={provider.name}
              variants={fadeScale}
              whileHover={{ x: -2, y: -2 }}
              whileTap={{ x: 2, y: 2 }}
              transition={{ duration: 0.15 }}
            >
              <div
                className="h-full p-5 border-black rounded-lg"
                style={{
                  background: provider.bg,
                  border: provider.selected
                    ? "3px solid #000"
                    : "2px solid #000",
                  boxShadow: provider.selected
                    ? "8px 8px 0 0 #000"
                    : "5px 5px 0 0 #000",
                }}
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="inline-flex items-center gap-1.5 rounded border-2 border-black px-2.5 py-1 text-[11px] font-bold bg-white">
                    <span
                      className="h-2 w-2 rounded-full border border-black"
                      style={{ background: provider.color }}
                    />
                    {provider.name}
                  </span>
                  {provider.selected && (
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-black">
                      <Check className="h-3.5 w-3.5 text-white" />
                    </span>
                  )}
                </div>

                <div className="rounded border-2 border-black bg-white p-2.5">
                  <div className="h-12 rounded-sm bg-black opacity-10 mb-2.5" />
                  <div className="space-y-1.5">
                    {provider.lines.map((width, j) => (
                      <div
                        key={j}
                        className="h-1.5 rounded-full bg-black opacity-20"
                        style={{ width: `${width}%` }}
                      />
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  className="mt-4 w-full rounded border-2 border-black text-xs h-8 font-bold transition-all duration-150"
                  style={{
                    background: provider.selected ? "#000" : "#fff",
                    color: provider.selected ? "#fff" : "#000",
                    boxShadow: "2px 2px 0 0 #000",
                  }}
                >
                  {provider.selected ? "Selected" : "Select variant"}
                </button>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
