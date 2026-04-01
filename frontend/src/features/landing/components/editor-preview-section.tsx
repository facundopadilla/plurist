"use client";

import { motion } from "framer-motion";
import { Check, MessageSquare, Palette, Code, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

const FEATURES = [
  { icon: Palette, text: "tldraw-powered infinite canvas" },
  { icon: Code, text: "Multi-slide campaigns with variants" },
  { icon: MessageSquare, text: "Real-time AI chat in the editor" },
  { icon: Download, text: "Export to PNG, JPEG, or WebP" },
] as const;

export function EditorPreviewSection() {
  return (
    <section className="py-24 sm:py-32 bg-muted/30">
      <div className="flex flex-col lg:flex-row items-center gap-16 max-w-6xl mx-auto px-4">
        {/* Left */}
        <motion.div
          className="lg:w-1/2"
          initial={{ opacity: 0, x: -24 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="paper-kicker">CODE-FIRST EDITOR</p>
          <h2 className="text-section-headline text-foreground leading-tight mt-3">
            Familiar design UX.
            <br />
            Code underneath.
          </h2>
          <p className="text-muted-foreground leading-relaxed mt-4 text-lg">
            Everything you create in the canvas is HTML and CSS under the hood.
            That means templates, version control, and AI generation — all
            working together.
          </p>

          <ul className="space-y-4 mt-8">
            {FEATURES.map(({ icon: Icon, text }, i) => (
              <motion.li
                key={text}
                className="flex items-center gap-3"
                initial={{ opacity: 0, x: -12 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{
                  duration: 0.4,
                  delay: 0.2 + i * 0.1,
                  ease: [0.22, 1, 0.36, 1],
                }}
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <Icon className="h-4 w-4 text-primary" />
                </span>
                <span className="text-foreground font-medium">{text}</span>
              </motion.li>
            ))}
          </ul>

          <motion.div
            className="mt-10"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.6 }}
          >
            <Button size="lg" asChild>
              <a href="/compose">Try the editor</a>
            </Button>
          </motion.div>
        </motion.div>

        {/* Right — editor mockup */}
        <motion.div
          className="lg:w-1/2 w-full"
          initial={{ opacity: 0, x: 40, rotateY: -5 }}
          whileInView={{ opacity: 1, x: 0, rotateY: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="rounded-[22px] border border-border bg-card shadow-2xl overflow-hidden">
            {/* Title bar */}
            <div className="flex items-center gap-2 border-b border-border px-4 py-3 bg-muted/30">
              <span className="h-3 w-3 rounded-full bg-red-400/80" />
              <span className="h-3 w-3 rounded-full bg-yellow-400/80" />
              <span className="h-3 w-3 rounded-full bg-green-400/80" />
              <span className="ml-3 text-xs text-muted-foreground font-medium">
                Canvas Studio
              </span>
            </div>

            {/* Body */}
            <div className="p-4 h-[380px] flex gap-3 bg-gradient-to-br from-background via-background to-muted/20">
              {/* Mini sidebar */}
              <div className="hidden sm:flex w-10 flex-col items-center gap-2 py-2">
                <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Palette className="h-3.5 w-3.5 text-primary" />
                </div>
                <div className="h-7 w-7 rounded-lg bg-muted flex items-center justify-center">
                  <Code className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                <div className="h-7 w-7 rounded-lg bg-muted flex items-center justify-center">
                  <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
              </div>

              {/* Main canvas */}
              <div className="flex-1 flex flex-col gap-3 justify-center items-center">
                <div className="w-full max-w-[280px] aspect-square rounded-xl border border-border bg-background shadow-sm p-6 flex flex-col items-center justify-center gap-3 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-secondary/5" />
                  <div className="relative z-10 flex flex-col items-center gap-2">
                    <div className="h-12 w-12 rounded-2xl bg-primary/15 flex items-center justify-center">
                      <Check className="h-6 w-6 text-primary" />
                    </div>
                    <div className="h-3 w-32 rounded-full bg-foreground/70 mt-2" />
                    <div className="h-2 w-44 rounded-full bg-muted-foreground/25" />
                    <div className="h-2 w-36 rounded-full bg-muted-foreground/25" />
                    <div className="mt-3 h-8 w-24 rounded-lg bg-primary" />
                  </div>
                </div>
              </div>

              {/* Slides panel */}
              <div className="hidden md:flex w-16 flex-col gap-2 py-2">
                <div className="rounded-lg border-2 border-primary bg-background aspect-square p-0.5">
                  <div className="h-full w-full rounded bg-primary/5" />
                </div>
                <div className="rounded-lg border border-border bg-background aspect-square p-0.5 opacity-50">
                  <div className="h-full w-full rounded bg-muted/50" />
                </div>
                <div className="rounded-lg border border-border bg-background aspect-square p-0.5 opacity-30">
                  <div className="h-full w-full rounded bg-muted/50" />
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
