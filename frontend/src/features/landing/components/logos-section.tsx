"use client";

import { motion } from "framer-motion";
import { ease, fadeScale, staggerContainer } from "../lib/animations";

const ITEMS = [
  { label: "Instagram", dot: "#E1306C" },
  { label: "LinkedIn", dot: "#0A66C2" },
  { label: "X", dot: "#000" },
  { label: "OpenAI", dot: "#10a37f" },
  { label: "Anthropic", dot: "#d97706" },
  { label: "Gemini", dot: "#4285f4" },
];

export function LogosSection() {
  return (
    <section className="py-16 sm:py-20 bg-white border-b-2 border-black">
      <div className="max-w-6xl mx-auto px-6">
        <motion.p
          className="text-center text-xs text-black mb-6 tracking-widest uppercase font-bold"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, ease }}
        >
          Publish everywhere · Generate with any model
        </motion.p>
        <motion.div
          className="flex flex-wrap items-center justify-center gap-3"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {ITEMS.map(({ label, dot }) => (
            <motion.div
              key={label}
              variants={fadeScale}
              whileHover={{ x: -2, y: -2 }}
              whileTap={{ x: 2, y: 2 }}
              transition={{ duration: 0.15 }}
              className="flex items-center gap-2 bg-white border-2 border-black rounded px-4 py-2 text-sm text-black font-bold cursor-default"
              style={{ boxShadow: "3px 3px 0 0 #000" }}
            >
              <span
                className="h-2 w-2 rounded-full shrink-0 border border-black"
                style={{ background: dot }}
              />
              {label}
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
