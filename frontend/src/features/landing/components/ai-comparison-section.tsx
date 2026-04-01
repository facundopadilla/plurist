"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

const PROVIDERS = [
  {
    name: "OpenAI",
    badgeClass:
      "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20",
    lines: [100, 85, 92, 65, 45, 78],
    selected: false,
  },
  {
    name: "Anthropic",
    badgeClass:
      "bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20",
    lines: [95, 100, 70, 88, 50, 62],
    selected: true,
  },
  {
    name: "Gemini",
    badgeClass:
      "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20",
    lines: [100, 78, 85, 55, 90, 42],
    selected: false,
  },
] as const;

export function AiComparisonSection() {
  return (
    <section id="ai-comparison" className="py-24 sm:py-32 bg-background">
      <div className="max-w-7xl mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="text-center"
        >
          <p className="paper-kicker">MULTI-AI COMPARISON</p>
          <h2 className="text-display text-foreground mt-3">
            Not locked into one model.
          </h2>
          <p className="paper-lead mx-auto mt-3 max-w-2xl">
            Run the same prompt through OpenAI, Anthropic, and Gemini
            simultaneously. Compare outputs side by side. Pick the best.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto mt-16">
          {PROVIDERS.map((provider, i) => (
            <motion.div
              key={provider.name}
              className={`rounded-[18px] border bg-card p-5 shadow-sm transition-shadow hover:shadow-md ${
                provider.selected
                  ? "border-primary ring-2 ring-primary/20"
                  : "border-border"
              }`}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{
                duration: 0.5,
                delay: i * 0.12,
                ease: [0.22, 1, 0.36, 1],
              }}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${provider.badgeClass}`}
                >
                  {provider.name}
                </span>
                {provider.selected && (
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary">
                    <Check className="h-3 w-3 text-primary-foreground" />
                  </span>
                )}
              </div>

              {/* Mockup content — fake post */}
              <div className="mt-4 space-y-2.5">
                <div className="h-20 rounded-lg bg-gradient-to-br from-primary/8 to-secondary/8 border border-border" />
                {provider.lines.map((width, j) => (
                  <div
                    key={j}
                    className="h-2 rounded-full bg-muted"
                    style={{ width: `${width}%` }}
                  />
                ))}
              </div>

              <div className="mt-5 pt-4 border-t border-border">
                <Button
                  variant={provider.selected ? "default" : "outline"}
                  size="sm"
                  className="w-full text-xs"
                >
                  {provider.selected ? "Selected" : "Select this variant"}
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
