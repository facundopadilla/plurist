"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export function CtaSection() {
  return (
    <section className="relative py-32 sm:py-40 overflow-hidden bg-background">
      {/* Ambient gradient orbs */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[800px] rounded-full bg-primary/[0.07] blur-[120px]" />
        <div className="absolute top-1/3 left-1/4 h-[300px] w-[400px] rounded-full bg-secondary/[0.06] blur-[100px]" />
        <div className="absolute bottom-1/3 right-1/4 h-[250px] w-[350px] rounded-full bg-primary/[0.05] blur-[100px]" />
      </div>

      {/* Subtle grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />

      {/* Horizontal glow line */}
      <motion.div
        className="absolute top-0 left-1/2 -translate-x-1/2 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent"
        initial={{ width: "0%" }}
        whileInView={{ width: "60%" }}
        viewport={{ once: true }}
        transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
      />

      {/* Content */}
      <div className="relative z-10 max-w-3xl mx-auto px-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          <h2 className="text-display text-foreground">
            Ready to create content
            <br />
            <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              from code?
            </span>
          </h2>
        </motion.div>

        <motion.p
          className="paper-lead mx-auto mt-6 max-w-xl text-lg"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
        >
          Start building with Plurist today. No credit card required.
        </motion.p>

        <motion.div
          className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
        >
          <Button
            size="lg"
            className="px-8 text-base font-semibold gap-2"
            asChild
          >
            <a href="/login">
              Get started free
              <ArrowRight className="h-4 w-4" />
            </a>
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="px-8 text-base"
            asChild
          >
            <a href="#features">See the features</a>
          </Button>
        </motion.div>
      </div>

      {/* Bottom glow line */}
      <motion.div
        className="absolute bottom-0 left-1/2 -translate-x-1/2 h-px bg-gradient-to-r from-transparent via-secondary/30 to-transparent"
        initial={{ width: "0%" }}
        whileInView={{ width: "40%" }}
        viewport={{ once: true }}
        transition={{ duration: 1.2, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
      />
    </section>
  );
}
