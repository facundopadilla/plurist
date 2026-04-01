"use client";

import { motion } from "framer-motion";

const PILLS = [
  { label: "Instagram", color: "bg-pink-500" },
  { label: "LinkedIn", color: "bg-blue-600" },
  { label: "X (Twitter)", color: "bg-foreground" },
  { label: "OpenAI", color: "bg-emerald-500" },
  { label: "Anthropic", color: "bg-orange-500" },
  { label: "Gemini", color: "bg-violet-500" },
];

export function LogosSection() {
  return (
    <section className="py-16 bg-background">
      <div className="max-w-7xl mx-auto px-4">
        <p className="text-center text-sm text-muted-foreground mb-8">
          Publish to every network. Generate with any model.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          {PILLS.map(({ label, color }, i) => (
            <motion.div
              key={label}
              className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm text-muted-foreground"
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.07 }}
            >
              <span className={`h-2 w-2 rounded-full ${color} shrink-0`} />
              {label}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
