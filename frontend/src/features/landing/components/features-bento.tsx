"use client";

import { motion } from "framer-motion";
import {
  BarChart3,
  Brush,
  GitCompareArrows,
  Library,
  Share2,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { BentoGrid, BentoGridItem } from "../lib/aceternity/bento-grid";

function CanvasMockup() {
  return (
    <div className="h-36 rounded-lg border border-border bg-muted/30 overflow-hidden flex">
      {/* Mini sidebar */}
      <div className="w-8 border-r border-border bg-card flex flex-col items-center py-2 gap-2">
        <div className="h-4 w-4 rounded bg-primary/20" />
        <div className="h-4 w-4 rounded bg-muted" />
        <div className="h-4 w-4 rounded bg-muted" />
      </div>
      {/* Canvas */}
      <div className="flex-1 p-3 flex items-center justify-center">
        <div className="w-full max-w-[120px] aspect-square rounded-lg border border-border bg-background shadow-sm flex flex-col items-center justify-center gap-1.5 p-2">
          <Sparkles className="h-4 w-4 text-primary/60" />
          <div className="h-1.5 w-16 rounded-full bg-foreground/60" />
          <div className="h-1 w-12 rounded-full bg-muted-foreground/30" />
          <div className="h-1 w-14 rounded-full bg-muted-foreground/30" />
        </div>
      </div>
    </div>
  );
}

function ComparisonMockup() {
  return (
    <div className="h-36 rounded-lg border border-border bg-muted/30 overflow-hidden p-3 flex gap-2">
      {[
        { label: "GPT-4", color: "bg-emerald-500" },
        { label: "Claude", color: "bg-orange-500" },
        { label: "Gemini", color: "bg-blue-500" },
      ].map((m) => (
        <div
          key={m.label}
          className="flex-1 rounded-md border border-border bg-background p-2 flex flex-col gap-1.5"
        >
          <div className="flex items-center gap-1">
            <span className={`h-1.5 w-1.5 rounded-full ${m.color}`} />
            <span className="text-[8px] text-muted-foreground font-medium">
              {m.label}
            </span>
          </div>
          <div className="h-1 w-full rounded-full bg-muted" />
          <div className="h-1 w-4/5 rounded-full bg-muted" />
          <div className="h-1 w-3/5 rounded-full bg-muted" />
          <div className="mt-auto h-1 w-2/5 rounded-full bg-primary/40" />
        </div>
      ))}
    </div>
  );
}

const ITEMS = [
  {
    icon: <Brush className="h-5 w-5 text-primary" />,
    title: "Visual canvas, code power",
    description:
      "A full tldraw-based editor with multi-slide support, real-time AI chat, and HTML/CSS under the hood.",
    header: <CanvasMockup />,
    className: "lg:col-span-2",
  },
  {
    icon: <GitCompareArrows className="h-5 w-5 text-secondary" />,
    title: "Compare AI models side by side",
    description:
      "Run OpenAI, Anthropic, and Gemini simultaneously. A/B test outputs before committing.",
    header: <ComparisonMockup />,
    className: "lg:col-span-2",
  },
  {
    icon: <Library className="h-5 w-5 text-primary" />,
    title: "Centralized asset library",
    description:
      "Images, fonts, colors, HTML templates, PDFs — all organized by project.",
  },
  {
    icon: <ShieldCheck className="h-5 w-5 text-primary" />,
    title: "Built-in approval workflow",
    description:
      "Creator to approver to publisher. Role-based, with full audit trail.",
  },
  {
    icon: <Share2 className="h-5 w-5 text-secondary" />,
    title: "Publish everywhere at once",
    description:
      "Instagram, LinkedIn, X — schedule and deliver from a single queue.",
  },
  {
    icon: <BarChart3 className="h-5 w-5 text-primary" />,
    title: "Measure what matters",
    description:
      "Publishing metrics, engagement insights, and throughput dashboards.",
  },
];

export function FeaturesBento() {
  return (
    <section id="features" className="py-24 sm:py-32 bg-background">
      <div className="max-w-7xl mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="text-center"
        >
          <p className="paper-kicker">EVERYTHING YOU NEED</p>
          <h2 className="text-display text-foreground mt-3">
            One platform, zero compromises.
          </h2>
          <p className="paper-lead mx-auto text-center mt-3">
            From design to delivery, Plurist handles every step of your content
            workflow.
          </p>
        </motion.div>

        <div className="mt-16">
          <BentoGrid className="lg:grid-cols-4">
            {ITEMS.map((item, i) => (
              <motion.div
                key={item.title}
                className={item.className}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{
                  duration: 0.5,
                  delay: i * 0.08,
                  ease: [0.22, 1, 0.36, 1],
                }}
              >
                <BentoGridItem
                  icon={item.icon}
                  title={item.title}
                  description={item.description}
                  header={item.header}
                  className="h-full"
                />
              </motion.div>
            ))}
          </BentoGrid>
        </div>
      </div>
    </section>
  );
}
