import { motion } from "framer-motion";
import { fadeUp } from "../lib/animations";

const logos = [
  "Acme Corp",
  "TechFlow",
  "Buildify",
  "Nova Labs",
  "Creatify",
  "Marketo",
  "GrowthX",
  "Launchpad",
];

export function L2LogosSection() {
  return (
    <section className="overflow-hidden border-y border-neutral-100 bg-neutral-50/60 py-12">
      <div className="mx-auto max-w-6xl px-6">
        <motion.p
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="mb-8 text-center text-[13px] font-medium uppercase tracking-[0.18em] text-neutral-400"
        >
          Trusted by 500+ teams worldwide
        </motion.p>

        {/* Infinite scroll strip */}
        <div className="relative flex overflow-hidden [mask-image:linear-gradient(to_right,transparent,white_10%,white_90%,transparent)]">
          <motion.div
            className="flex shrink-0 gap-12"
            animate={{ x: ["0%", "-50%"] }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          >
            {[...logos, ...logos].map((name, i) => (
              <div
                key={`${name}-${i}`}
                className="flex h-8 w-28 flex-shrink-0 items-center justify-center"
              >
                <span className="text-[13px] font-bold tracking-tight text-neutral-300">
                  {name}
                </span>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
