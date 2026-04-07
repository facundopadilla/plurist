"use client";

import { motion } from "framer-motion";
import {
  BarChart3,
  Brush,
  Code2,
  GitCompareArrows,
  Library,
  Puzzle,
  Recycle,
  Share2,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import {
  ease,
  fadeUp,
  fadeScale,
  revealUp,
  staggerContainer,
} from "../lib/animations";

const PASTEL_CARD_COLORS = ["#d5eaff", "#fddd9a"];

function CanvasMockup() {
  return (
    <div
      className="h-36 rounded border-2 border-black bg-brutal-pastel-blue overflow-hidden flex"
      style={{ boxShadow: "3px 3px 0 0 #000" }}
    >
      <div className="w-8 border-r-2 border-black flex flex-col items-center py-2.5 gap-1.5 bg-white">
        <div className="h-4 w-4 rounded-sm border-2 border-black bg-brutal-yellow" />
        <div className="h-4 w-4 rounded-sm border-2 border-black bg-white" />
        <div className="h-4 w-4 rounded-sm border-2 border-black bg-white" />
      </div>
      <div className="flex-1 p-3 flex items-center justify-center">
        <div className="w-full max-w-[120px] aspect-square rounded border-2 border-black bg-white flex flex-col items-center justify-center gap-1.5 p-2.5 shadow-brutal-sm">
          <Sparkles className="h-4 w-4 text-black" />
          <div className="h-1 w-14 rounded-sm bg-black" />
          <div className="h-0.5 w-10 rounded-sm bg-black opacity-40" />
          <div className="h-0.5 w-12 rounded-sm bg-black opacity-30" />
        </div>
      </div>
    </div>
  );
}

function ComparisonMockup() {
  return (
    <div
      className="h-36 rounded border-2 border-black bg-brutal-pastel-yellow overflow-hidden p-2.5 flex gap-1.5"
      style={{ boxShadow: "3px 3px 0 0 #000" }}
    >
      {[
        { label: "GPT-4", color: "#10a37f" },
        { label: "Claude", color: "#d97706" },
        { label: "Gemini", color: "#4285f4" },
      ].map((m) => (
        <div
          key={m.label}
          className="flex-1 rounded border-2 border-black bg-white p-2 flex flex-col gap-1.5"
        >
          <div className="flex items-center gap-1">
            <span
              className="h-2 w-2 rounded-full border border-black"
              style={{ background: m.color }}
            />
            <span className="text-[8px] text-black font-bold uppercase tracking-wider">
              {m.label}
            </span>
          </div>
          <div className="space-y-1">
            <div className="h-1 w-full rounded-sm bg-black opacity-20" />
            <div className="h-1 w-4/5 rounded-sm bg-black opacity-15" />
            <div className="h-1 w-3/5 rounded-sm bg-black opacity-10" />
          </div>
          <div className="mt-auto h-4 w-full rounded-sm bg-brutal-yellow border border-black" />
        </div>
      ))}
    </div>
  );
}

const ITEMS = [
  {
    icon: Brush,
    title: "Visual canvas, code power",
    description:
      "A full editor with multi-slide support, real-time AI chat, and HTML/CSS under the hood.",
    header: <CanvasMockup />,
    span: 2,
    pastelIndex: 0,
  },
  {
    icon: GitCompareArrows,
    title: "Compare AI models side by side",
    description:
      "Run OpenAI, Anthropic, and Gemini simultaneously. A/B test outputs before committing.",
    header: <ComparisonMockup />,
    span: 2,
    pastelIndex: 1,
  },
  {
    icon: Library,
    title: "Centralized asset library",
    description:
      "Images, fonts, colors, HTML templates, PDFs — all organized by project.",
  },
  {
    icon: ShieldCheck,
    title: "Built-in approval workflow",
    description:
      "Creator to approver to publisher. Role-based, with full audit trail.",
  },
  {
    icon: Share2,
    title: "Publish everywhere at once",
    description:
      "Instagram, LinkedIn, X — schedule and deliver from a single queue.",
  },
  {
    icon: BarChart3,
    title: "Measure what matters",
    description:
      "Publishing metrics, engagement insights, and throughput dashboards.",
  },
  {
    icon: Code2,
    title: "Code editor & visual editor",
    description:
      "Switch between a low-level code editor and a high-level visual canvas. Full control at every layer.",
    span: 2,
    pastelIndex: 0,
  },
  {
    icon: Puzzle,
    title: "Install skills & extend",
    description:
      "Add community or custom skills to unlock new generation styles, templates, and workflows.",
  },
  {
    icon: Recycle,
    title: "Reuse everything",
    description:
      "Templates, components, brand assets, and AI prompts — save once, reuse across every project.",
  },
];

type BentoItem = (typeof ITEMS)[number];

function getCardVariant(item: BentoItem, index: number) {
  if ("span" in item && item.span === 2) return revealUp;
  return index % 2 === 0 ? fadeUp : fadeScale;
}

export function FeaturesBento() {
  return (
    <section
      id="features"
      className="py-24 sm:py-32 bg-brutal-bg border-b-2 border-black"
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
            Everything you need
          </p>
          <h2 className="font-display font-extrabold text-[40px] sm:text-[56px] lg:text-[64px] leading-[1] tracking-[-0.04em] text-black">
            One platform, <span className="text-[#555]">zero compromises.</span>
          </h2>
          <p className="mt-4 text-base text-[#555] max-w-xl mx-auto leading-relaxed font-medium">
            From websites to social posts, Plurist handles every step of your
            content workflow.
          </p>
        </motion.div>

        <motion.div
          className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
        >
          {ITEMS.map((item, i) => {
            const Icon = item.icon;
            const isSpan = "span" in item && item.span === 2;
            const bg =
              isSpan && "pastelIndex" in item
                ? PASTEL_CARD_COLORS[item.pastelIndex as 0 | 1]
                : "#ffffff";

            return (
              <motion.div
                key={item.title}
                className={isSpan ? "lg:col-span-2" : "col-span-1"}
                variants={getCardVariant(item, i)}
                whileHover={{ x: -2, y: -2 }}
                whileTap={{ x: 2, y: 2 }}
                transition={{ duration: 0.15 }}
              >
                <div
                  className="relative h-full border-2 border-black rounded-lg p-5 transition-shadow duration-200"
                  style={{
                    background: bg,
                    boxShadow: "5px 5px 0 0 #000",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLDivElement).style.boxShadow =
                      "7px 7px 0 0 #000";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLDivElement).style.boxShadow =
                      "5px 5px 0 0 #000";
                  }}
                >
                  {"header" in item && item.header && (
                    <div className="mb-4">{item.header}</div>
                  )}
                  <div className="inline-flex h-8 w-8 items-center justify-center rounded border-2 border-black mb-3 bg-brutal-yellow">
                    <Icon className="h-4 w-4 text-black" />
                  </div>
                  <h3 className="font-bold text-sm text-black">{item.title}</h3>
                  <p className="mt-1.5 text-xs text-[#555] leading-relaxed font-medium">
                    {item.description}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
