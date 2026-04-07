"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ease, fadeUp, staggerContainer } from "../lib/animations";

const FAQS = [
  {
    q: "What is Plurist?",
    a: "Plurist is a collaborative content design platform that combines a visual canvas, code editor, and AI assistant in one place. You can design websites, social posts, and slides — then publish directly to your social channels.",
  },
  {
    q: "Which AI models are supported?",
    a: "We support OpenAI (GPT-4o), Anthropic (Claude), and Google Gemini. You can run the same prompt through all three simultaneously and compare outputs before choosing which variant to publish.",
  },
  {
    q: "Can I use my own HTML and CSS?",
    a: "Yes. Everything in Plurist is HTML and CSS under the hood. You can switch between the visual canvas and a full code editor at any point — both stay in sync in real-time.",
  },
  {
    q: "How does team collaboration work?",
    a: "Plurist has a built-in approval workflow: Creators design and generate content, Approvers review and approve it, Publishers schedule and deploy. All with a full audit trail and comment threads.",
  },
  {
    q: "Which social platforms can I publish to?",
    a: "Currently Instagram, LinkedIn, and X (Twitter). We're actively adding YouTube Shorts, TikTok, and Facebook. You can schedule posts, manage queues, and track performance from a unified dashboard.",
  },
  {
    q: "Is there a free plan?",
    a: "Yes. The free plan includes 3 projects, access to 1 AI model, and up to 10 published posts per month. No credit card required to get started.",
  },
  {
    q: "Can I import existing templates?",
    a: "Absolutely. You can import any HTML/CSS template into Plurist and use it as a base for AI-generated variants. The asset library lets you organize templates, images, fonts, and brand colors across projects.",
  },
];

export function FaqSection() {
  return (
    <section
      id="faq"
      className="py-24 sm:py-32 bg-brutal-pastel-green border-b-2 border-black"
    >
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex flex-col lg:flex-row gap-16 lg:gap-24">
          {/* Left */}
          <motion.div
            className="lg:w-5/12 shrink-0"
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, ease }}
          >
            <p className="font-mono text-xs uppercase tracking-wider text-black font-bold mb-4">
              FAQ
            </p>
            <h2 className="font-display font-extrabold text-[40px] sm:text-[56px] leading-[1] tracking-[-0.04em] text-black">
              Questions, <span className="text-[#444]">answered.</span>
            </h2>
            <p className="mt-4 text-base text-[#333] leading-relaxed font-medium">
              Still have questions? Reach out to us directly.
            </p>
            <a
              href="mailto:hello@plurist.io"
              className="mt-6 inline-flex items-center gap-1.5 text-sm font-bold text-black underline underline-offset-4 hover:text-[#444] transition-colors duration-150"
            >
              Contact us
              <ArrowRight className="h-3.5 w-3.5" />
            </a>
          </motion.div>

          {/* Right — accordion */}
          <motion.div
            className="flex-1"
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
          >
            <Accordion type="single" collapsible className="space-y-2">
              {FAQS.map((faq, i) => (
                <motion.div key={faq.q} variants={fadeUp} custom={i}>
                  <AccordionItem
                    value={`faq-${i}`}
                    className="border-2 border-black rounded-lg bg-white data-[state=open]:bg-brutal-pastel-blue overflow-hidden transition-colors duration-200"
                    style={{ boxShadow: "3px 3px 0 0 #000" }}
                  >
                    <AccordionTrigger className="text-sm font-bold text-left hover:no-underline py-4 px-5 text-black">
                      {faq.q}
                    </AccordionTrigger>
                    <AccordionContent className="text-sm text-[#333] leading-relaxed pb-4 px-5 font-medium">
                      {faq.a}
                    </AccordionContent>
                  </AccordionItem>
                </motion.div>
              ))}
            </Accordion>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
