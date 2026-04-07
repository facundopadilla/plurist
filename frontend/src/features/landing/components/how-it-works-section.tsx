"use client";

import { motion } from "framer-motion";
import { ease, slideFromLeft, staggerContainer } from "../lib/animations";

const STEPS = [
  {
    number: "01",
    title: "Design",
    description:
      "Write HTML and CSS or use the visual canvas. Drag, type, style — just like a design tool, but everything is code underneath.",
    bg: "#d5eaff",
  },
  {
    number: "02",
    title: "Generate & Approve",
    description:
      "Ask AI to create variants. Compare outputs from multiple models. Send through your team's approval workflow.",
    bg: "#c8daaa",
  },
  {
    number: "03",
    title: "Publish",
    description:
      "Schedule across Instagram, LinkedIn, and X. Track performance from a unified analytics dashboard.",
    bg: "#fddd9a",
  },
];

export function HowItWorksSection() {
  return (
    <section
      id="how-it-works"
      className="py-24 sm:py-32 bg-white border-b-2 border-black"
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
            How it works
          </p>
          <h2 className="font-display font-extrabold text-[40px] sm:text-[56px] lg:text-[64px] leading-[1] tracking-[-0.04em] text-black">
            Three steps to published.
          </h2>
        </motion.div>

        <motion.div
          className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto relative"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
        >
          {/* Dashed connecting line */}
          <div className="hidden md:block absolute top-12 left-[16.67%] right-[16.67%]">
            <motion.div
              className="border-t-2 border-dashed border-black origin-left"
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: 0.3, ease }}
            />
          </div>

          {STEPS.map((step) => (
            <motion.div
              key={step.number}
              variants={slideFromLeft}
              whileHover={{ x: -2, y: -2 }}
              whileTap={{ x: 2, y: 2 }}
              transition={{ duration: 0.15 }}
            >
              <div
                className="relative h-full border-2 border-black rounded-lg p-6"
                style={{
                  background: step.bg,
                  boxShadow: "5px 5px 0 0 #000",
                }}
              >
                <span className="font-display font-extrabold text-[48px] leading-none text-black">
                  {step.number}
                </span>
                <h3 className="mt-3 text-lg font-bold text-black">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm text-[#333] leading-relaxed font-medium">
                  {step.description}
                </p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
