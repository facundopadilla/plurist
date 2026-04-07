import { motion } from "framer-motion";
import { Button } from "@heroui/react";
import { ArrowRight, Sparkles } from "lucide-react";
import { fadeScale, stagger, fadeUp } from "../lib/animations";

export function L2CtaSection() {
  return (
    <section className="py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <motion.div
          variants={fadeScale}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 px-8 py-16 text-center sm:px-16"
        >
          {/* Background pattern */}
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
              backgroundSize: "32px 32px",
            }}
          />

          {/* Glow orbs */}
          <div className="pointer-events-none absolute left-1/4 top-0 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/10 blur-3xl" />
          <div className="pointer-events-none absolute bottom-0 right-1/4 h-64 w-64 translate-x-1/2 translate-y-1/2 rounded-full bg-white/10 blur-3xl" />

          <div className="relative z-10">
            <motion.div
              variants={stagger}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
            >
              <motion.div
                variants={fadeUp}
                className="mb-4 flex justify-center"
              >
                <div className="flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-[13px] font-medium text-white/90 backdrop-blur-sm">
                  <Sparkles size={13} />
                  No credit card required
                </div>
              </motion.div>

              <motion.h2
                variants={fadeUp}
                className="text-[36px] font-bold leading-[1.08] tracking-[-0.03em] text-white sm:text-[48px]"
              >
                Start creating content
                <br />
                that actually grows
              </motion.h2>

              <motion.p
                variants={fadeUp}
                className="mx-auto mt-4 max-w-xl text-[17px] text-white/75"
              >
                Join 500+ teams who use Plurist to save hours every week and
                grow their social media presence with AI.
              </motion.p>

              <motion.div
                variants={fadeUp}
                className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row"
              >
                <a href="/login" className="w-full sm:w-auto">
                  <Button
                    size="lg"
                    className="w-full rounded-xl bg-white px-8 font-semibold text-indigo-700 shadow-lg transition-all hover:bg-white/95 hover:shadow-xl"
                  >
                    <span className="flex items-center gap-2">
                      Get started free
                      <ArrowRight size={16} />
                    </span>
                  </Button>
                </a>
                <a href="/login" className="w-full sm:w-auto">
                  <Button
                    size="lg"
                    className="w-full rounded-xl border border-white/30 bg-white/10 px-8 font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/20"
                  >
                    View live demo
                  </Button>
                </a>
              </motion.div>

              <motion.p
                variants={fadeUp}
                className="mt-5 text-[13px] text-white/60"
              >
                Free plan forever · 14-day Pro trial · No setup fees
              </motion.p>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
