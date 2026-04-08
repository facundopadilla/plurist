import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Minus } from "lucide-react";
import { fadeUp, stagger, slideFromRight } from "../lib/animations";

const faqs = [
  {
    question: "What social media platforms does Plurist support?",
    answer:
      "Plurist currently supports Instagram, LinkedIn, X (Twitter), TikTok, Facebook, and Pinterest. We're adding more platforms regularly — YouTube Shorts and Threads are coming soon.",
  },
  {
    question: "How does the multi-model AI work?",
    answer:
      "When you generate content, Plurist runs your prompt through all three AI models simultaneously — GPT-4o, Claude, and Gemini. You see all three outputs side by side and pick the one that best fits your brand voice. You can also mix and match parts from different outputs.",
  },
  {
    question: "Can I customize the AI to match my brand voice?",
    answer:
      "Yes. You can create a brand voice profile with specific tone, style, and terminology guidelines. Plurist uses this context when generating content, so every output already sounds like your brand.",
  },
  {
    question: "Is there a limit to how many posts I can schedule?",
    answer:
      "The Free plan allows 5 posts per month. Pro and Team plans have unlimited scheduling across all platforms. You can queue as far ahead as you want.",
  },
  {
    question: "Can multiple people work on the same workspace?",
    answer:
      "Collaboration is available on the Team plan. Team members can co-create content, leave comments, and have separate permission levels (viewer, editor, admin).",
  },
  {
    question: "How does the 14-day trial work?",
    answer:
      "Sign up for free and get full access to all Pro features for 14 days — no credit card required. After the trial, you can continue with the Free plan or upgrade to Pro or Team.",
  },
];

function FaqItem({
  faq,
}: Readonly<{ faq: { question: string; answer: string } }>) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-xl border border-neutral-200 bg-white shadow-sm">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-5 py-4 text-left"
        aria-expanded={open}
      >
        <span className="text-[15px] font-semibold text-neutral-900">
          {faq.question}
        </span>
        <div
          className={`ml-3 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full transition-colors ${
            open
              ? "bg-indigo-100 text-indigo-600"
              : "bg-neutral-100 text-neutral-400"
          }`}
        >
          {open ? <Minus size={13} /> : <Plus size={13} />}
        </div>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <p className="px-5 pb-5 text-[14px] leading-relaxed text-neutral-600">
              {faq.answer}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function L2FaqSection() {
  return (
    <section id="faq" className="bg-neutral-50/60 py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1fr_1.4fr] lg:gap-16">
          {/* Left: heading */}
          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            <motion.p
              variants={fadeUp}
              className="mb-3 text-[13px] font-semibold uppercase tracking-[0.18em] text-indigo-500"
            >
              FAQ
            </motion.p>
            <motion.h2
              variants={fadeUp}
              className="mb-5 text-[36px] font-bold leading-[1.1] tracking-[-0.03em] text-neutral-900 sm:text-[44px]"
            >
              Common
              <br />
              <span className="bg-gradient-to-r from-indigo-500 to-violet-600 bg-clip-text text-transparent">
                questions
              </span>
            </motion.h2>
            <motion.p
              variants={fadeUp}
              className="mb-6 text-[16px] leading-relaxed text-neutral-500"
            >
              Can&apos;t find what you&apos;re looking for? We&apos;re happy to
              help.
            </motion.p>
            <motion.div variants={fadeUp}>
              <a
                href="mailto:hello@plurist.app"
                className="text-[14px] font-semibold text-indigo-500 hover:text-indigo-700"
              >
                Contact support →
              </a>
            </motion.div>
          </motion.div>

          {/* Right: accordion */}
          <motion.div
            variants={slideFromRight}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="flex flex-col gap-2"
          >
            {faqs.map((faq) => (
              <FaqItem key={faq.question} faq={faq} />
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
