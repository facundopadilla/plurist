"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { ease } from "../lib/animations";

export function CtaSection() {
  return (
    <section className="relative py-36 sm:py-48 bg-brutal-yellow border-b-2 border-black brutal-grid-bg overflow-hidden">
      {/* Content */}
      <div className="relative z-10 max-w-2xl mx-auto px-6 text-center">
        <motion.h2
          className="font-display font-extrabold text-[40px] sm:text-[56px] lg:text-[72px] leading-[1] tracking-[-0.04em] text-black"
          initial={{ opacity: 0, scale: 0.92 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, ease }}
        >
          <span>Ready to create</span>
          <br />
          <span className="text-[#333]">something great?</span>
        </motion.h2>

        <motion.p
          className="mt-5 text-base text-[#333] max-w-md mx-auto leading-relaxed font-medium"
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.15, ease }}
        >
          Start building with Plurist today. No credit card required.
        </motion.p>

        <motion.div
          className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3"
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.3, ease }}
        >
          <motion.a
            href="/login"
            className="brutal-btn bg-black text-white rounded-lg px-8 py-3 text-sm inline-flex items-center gap-2"
            whileHover={{ x: -2, y: -2 }}
            whileTap={{ x: 2, y: 2 }}
            transition={{ duration: 0.15 }}
          >
            Get started free
            <ArrowRight className="h-3.5 w-3.5" />
          </motion.a>
          <motion.a
            href="#features"
            className="brutal-btn bg-white text-black rounded-lg px-8 py-3 text-sm"
            whileHover={{ x: -2, y: -2 }}
            whileTap={{ x: 2, y: 2 }}
            transition={{ duration: 0.15 }}
          >
            See the features
          </motion.a>
        </motion.div>
      </div>
    </section>
  );
}
