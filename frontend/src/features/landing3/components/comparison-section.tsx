import { motion } from "framer-motion";
import { Check } from "lucide-react";
import {
  fadeUp,
  stagger,
  sectionClipReveal,
  revealClip,
} from "../lib/animations";

const ROWS = [
  { feature: "Open source", plurist: true, stitch: false, banani: false },
  { feature: "Self-hostable", plurist: true, stitch: false, banani: false },
  {
    feature: "Bring your own model",
    plurist: true,
    stitch: false,
    banani: false,
  },
  {
    feature: "Multi-provider compare",
    plurist: true,
    stitch: false,
    banani: false,
  },
  { feature: "Code editing", plurist: true, stitch: true, banani: true },
  { feature: "Visual canvas", plurist: true, stitch: true, banani: false },
  { feature: "HTML → Image export", plurist: true, stitch: true, banani: true },
  {
    feature: "Plugin architecture",
    plurist: true,
    stitch: false,
    banani: false,
  },
  {
    feature: "Free forever (self-hosted)",
    plurist: true,
    stitch: false,
    banani: false,
  },
];

function Cell({ value, highlight }: { value: boolean; highlight?: boolean }) {
  return (
    <td className="px-5 py-3.5 text-center">
      {value ? (
        <Check
          size={14}
          className={
            highlight ? "mx-auto text-emerald-400" : "mx-auto text-zinc-200"
          }
        />
      ) : (
        <span className="text-zinc-300">—</span>
      )}
    </td>
  );
}

export function ComparisonSection() {
  return (
    <section id="compare" className="relative scroll-mt-28 px-6 py-32">
      <div className="absolute left-1/2 top-0 h-px w-2/3 max-w-xl -translate-x-1/2 bg-gradient-to-r from-transparent via-zinc-700/30 to-transparent" />

      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-80px" }}
        variants={sectionClipReveal}
        className="mx-auto max-w-4xl"
      >
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-120px" }}
          variants={stagger}
          className="text-center"
        >
          <motion.span
            variants={fadeUp}
            className="font-mono text-[11px] uppercase tracking-[0.16em] text-zinc-200"
          >
            Comparison
          </motion.span>
          <motion.h2
            variants={fadeUp}
            className="mt-4 text-[clamp(1.8rem,4vw,3rem)] font-bold tracking-[-0.03em] text-zinc-50"
          >
            Plurist vs. the rest.
          </motion.h2>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={revealClip}
          className="mt-12"
        >
          <div className="relative">
            {/* Glow behind table */}
            <div className="absolute -inset-4 rounded-3xl bg-zinc-500/[0.03] blur-[40px]" />

            <div className="relative overflow-x-auto rounded-2xl border border-zinc-800/60 bg-zinc-900/30 backdrop-blur-sm">
              <table className="min-w-[38rem] w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-800/60">
                    <th className="px-5 py-4 font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-200">
                      Feature
                    </th>
                    <th className="px-5 py-4 text-center">
                      <span className="rounded-md bg-zinc-50 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.1em] text-zinc-900">
                        Plurist
                      </span>
                    </th>
                    <th className="px-5 py-4 text-center font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-200">
                      Stitch
                    </th>
                    <th className="px-5 py-4 text-center font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-200">
                      Banani
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {ROWS.map((row, i) => (
                    <tr
                      key={row.feature}
                      className={
                        i < ROWS.length - 1 ? "border-b border-zinc-800/40" : ""
                      }
                    >
                      <td className="px-5 py-3.5 text-[13px] text-zinc-300">
                        {row.feature}
                      </td>
                      <Cell value={row.plurist} highlight />
                      <Cell value={row.stitch} />
                      <Cell value={row.banani} />
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}
