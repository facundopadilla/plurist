"use client";

import { motion } from "framer-motion";
import { Star } from "lucide-react";
import { ease, fadeScale, staggerContainer } from "../lib/animations";

const TESTIMONIALS = [
  {
    name: "Sofia Reyes",
    role: "Head of Content",
    company: "Nubank",
    initials: "SR",
    color: "#8b5cf6",
    quote:
      "We went from 3 days to 2 hours for a full social campaign. The AI comparison feature alone is worth it — we never publish without running it through all three models.",
    stars: 5,
  },
  {
    name: "Marcus Chen",
    role: "Growth Lead",
    company: "Vercel",
    initials: "MC",
    color: "#0ea5e9",
    quote:
      "The code-first approach is exactly what our team needed. We maintain brand consistency across 40+ templates and the approval workflow keeps everyone aligned.",
    stars: 5,
  },
  {
    name: "Ana Volkov",
    role: "Creative Director",
    company: "Figma",
    initials: "AV",
    color: "#f43f5e",
    quote:
      "Honestly didn't expect to love a content tool this much. The visual canvas feels as good as designing in Figma, but everything is HTML underneath. Game changer.",
    stars: 5,
  },
];

type Testimonial = (typeof TESTIMONIALS)[number];

const TESTIMONIAL_CARD_CLASSNAME =
  "h-full rounded-lg border-2 border-black bg-white p-6";

function TestimonialCard({
  testimonial,
}: Readonly<{
  testimonial: Testimonial;
}>) {
  return (
    <div
      className={TESTIMONIAL_CARD_CLASSNAME}
      style={{ boxShadow: "5px 5px 0 0 #000" }}
    >
      <div className="mb-4 flex items-center gap-0.5">
        {Array.from({ length: testimonial.stars }).map((_, index) => (
          <Star
            key={`${testimonial.name}-star-${index}`}
            className="h-4 w-4 fill-black text-black"
          />
        ))}
      </div>
      <p className="text-sm font-medium leading-relaxed text-[#333]">
        &ldquo;{testimonial.quote}&rdquo;
      </p>
      <div className="mt-5 flex items-center gap-3">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-black text-xs font-bold text-white"
          style={{ background: testimonial.color }}
        >
          {testimonial.initials}
        </div>
        <div>
          <p className="text-sm font-bold text-black">{testimonial.name}</p>
          <p className="text-xs font-medium text-[#555]">
            {testimonial.role} · {testimonial.company}
          </p>
        </div>
      </div>
    </div>
  );
}

export function TestimonialsSection() {
  return (
    <section className="py-24 sm:py-32 bg-brutal-yellow border-b-2 border-black">
      <div className="max-w-6xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, ease }}
          className="text-center"
        >
          <p className="font-mono text-xs uppercase tracking-wider text-black font-bold mb-2">
            Social proof
          </p>
          <h2 className="font-display font-extrabold text-[40px] sm:text-[56px] lg:text-[64px] leading-[1] tracking-[-0.04em] text-black">
            Teams that <span className="text-[#444]">ship faster.</span>
          </h2>
        </motion.div>

        {/* Cards grid — desktop 3 cols */}
        <motion.div
          className="mt-12 hidden md:grid grid-cols-3 gap-4"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
        >
          {TESTIMONIALS.map((testimonial) => (
            <motion.div
              key={testimonial.name}
              variants={fadeScale}
              whileHover={{ x: -2, y: -2 }}
              whileTap={{ x: 2, y: 2 }}
              transition={{ duration: 0.15 }}
            >
              <TestimonialCard testimonial={testimonial} />
            </motion.div>
          ))}
        </motion.div>

        {/* Mobile scroll */}
        <div className="mt-12 md:hidden flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scroll-smooth -mx-6 px-6">
          {TESTIMONIALS.map((testimonial) => (
            <div
              key={testimonial.name}
              className="snap-center shrink-0 w-[80vw] max-w-sm"
            >
              <TestimonialCard testimonial={testimonial} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
