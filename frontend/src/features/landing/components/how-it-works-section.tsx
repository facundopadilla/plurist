"use client";

import { motion } from "framer-motion";
import { MovingBorder } from "../lib/aceternity/moving-border";

const STEPS = [
  {
    number: "1",
    title: "Design",
    description:
      "Write HTML and CSS or use the visual canvas. Drag, type, style — just like a design tool, but everything is code underneath.",
  },
  {
    number: "2",
    title: "Generate & Approve",
    description:
      "Ask AI to create variants. Compare outputs from multiple models. Send through your team's approval workflow.",
  },
  {
    number: "3",
    title: "Publish",
    description:
      "Schedule across Instagram, LinkedIn, and X. Track performance from a unified analytics dashboard.",
  },
];

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-24 sm:py-32 bg-muted/30">
      <div className="max-w-7xl mx-auto px-4">
        <p className="paper-kicker text-center">HOW IT WORKS</p>
        <h2 className="text-display text-foreground text-center mt-3">
          Three steps to published.
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16 max-w-5xl mx-auto">
          {STEPS.map((step, i) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
            >
              <MovingBorder>
                <div className="p-6">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-semibold">
                    {step.number}
                  </span>
                  <h3 className="mt-4 font-semibold text-lg text-foreground">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </MovingBorder>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
