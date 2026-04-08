import { motion } from "framer-motion";
import { Star } from "lucide-react";
import { fadeUp, stagger, revealUp } from "../lib/animations";

const testimonials = [
  {
    quote:
      "Plurist cut our content production time by 70%. The AI variations feature is a game-changer — we get three different tones and just pick the best one. Incredible.",
    name: "Sofia Reyes",
    role: "Head of Marketing",
    company: "Launchpad",
    initials: "SR",
    gradient: "from-indigo-400 to-violet-500",
  },
  {
    quote:
      "We manage 12 brands with different voices. Plurist's canvas + AI combo means each brand sounds authentic without us having to rewrite everything. This is the future.",
    name: "Marcus Chen",
    role: "Founder & CEO",
    company: "TechFlow",
    initials: "MC",
    gradient: "from-sky-400 to-blue-500",
  },
  {
    quote:
      "The scheduling alone is worth it. But then you add the analytics and the multi-platform preview — it's like having a full social media team in one tool.",
    name: "Ana Volkov",
    role: "Social Media Director",
    company: "Nova Labs",
    initials: "AV",
    gradient: "from-rose-400 to-pink-500",
  },
];

function Stars() {
  const starIds = ["one", "two", "three", "four", "five"];
  return (
    <div className="flex gap-0.5">
      {starIds.map((starId) => (
        <Star
          key={starId}
          size={14}
          className="fill-amber-400 text-amber-400"
        />
      ))}
    </div>
  );
}

export function L2TestimonialsSection() {
  return (
    <section id="testimonials" className="bg-neutral-50/60 py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-6">
        {/* Header */}
        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="mb-14 text-center"
        >
          <motion.p
            variants={fadeUp}
            className="mb-3 text-[13px] font-semibold uppercase tracking-[0.18em] text-indigo-500"
          >
            What people say
          </motion.p>
          <motion.h2
            variants={fadeUp}
            className="text-[36px] font-bold leading-[1.1] tracking-[-0.03em] text-neutral-900 sm:text-[44px]"
          >
            Loved by{" "}
            <span className="bg-gradient-to-r from-indigo-500 to-violet-600 bg-clip-text text-transparent">
              content teams
            </span>
          </motion.h2>
        </motion.div>

        {/* Cards grid */}
        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-1 gap-6 md:grid-cols-3"
        >
          {testimonials.map((t) => (
            <motion.div
              key={t.name}
              variants={revealUp}
              className="flex flex-col justify-between rounded-2xl border border-neutral-100 bg-white p-6 shadow-sm"
            >
              <div>
                <Stars />
                <p className="mt-4 text-[15px] leading-relaxed text-neutral-700">
                  &ldquo;{t.quote}&rdquo;
                </p>
              </div>

              <div className="mt-6 flex items-center gap-3 border-t border-neutral-50 pt-5">
                <div
                  className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-[13px] font-bold text-white ${t.gradient}`}
                >
                  {t.initials}
                </div>
                <div>
                  <div className="text-[14px] font-semibold text-neutral-900">
                    {t.name}
                  </div>
                  <div className="text-[12px] text-neutral-500">
                    {t.role} · {t.company}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Bottom social proof bar */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="mt-12 flex flex-wrap items-center justify-center gap-3 text-[14px] text-neutral-500"
        >
          <div className="flex -space-x-2">
            {["SR", "MC", "AV", "LK", "PR"].map((initials, i) => (
              <div
                key={initials}
                className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-gradient-to-br from-indigo-400 to-violet-500 text-[10px] font-bold text-white"
                style={{ zIndex: 5 - i }}
              >
                {initials}
              </div>
            ))}
          </div>
          <span>
            <strong className="font-semibold text-neutral-900">500+</strong>{" "}
            teams creating better content every day
          </span>
        </motion.div>
      </div>
    </section>
  );
}
