"use client";

import { motion } from "framer-motion";
import { Sparkles, MessageSquare, Layers, Image } from "lucide-react";
import { Spotlight } from "../lib/aceternity/spotlight";
import { TextGenerateEffect } from "../lib/aceternity/text-generate-effect";
import { Button } from "@/components/ui/button";

export function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-background pt-16">
      {/* Dot grid background */}
      <div
        className="absolute inset-0 z-0 opacity-30"
        style={{
          backgroundImage:
            "radial-gradient(hsl(var(--border)) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />

      {/* Gradient orbs */}
      <div className="absolute top-1/4 -left-32 h-96 w-96 rounded-full bg-primary/20 blur-[128px]" />
      <div className="absolute bottom-1/4 -right-32 h-96 w-96 rounded-full bg-secondary/20 blur-[128px]" />

      <Spotlight
        className="-top-40 left-0 md:-top-20 md:left-60"
        fill="hsl(var(--primary))"
      />

      {/* Content */}
      <div className="relative z-10 max-w-5xl mx-auto px-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <span className="paper-kicker inline-flex items-center gap-2 rounded-full border border-border bg-card/50 backdrop-blur-sm px-4 py-1.5">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            CODE-DRIVEN CONTENT
          </span>
        </motion.div>

        <div className="mt-6">
          <TextGenerateEffect
            words="Create content from code."
            className="text-hero text-foreground"
          />
        </div>

        <motion.p
          className="paper-lead mx-auto mt-6 max-w-2xl text-center text-lg"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          Design in a visual canvas, generate with AI, approve with your team,
          and publish everywhere — from a single workspace.
        </motion.p>

        <motion.div
          className="mt-10 flex items-center justify-center gap-4 flex-wrap"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          <Button size="lg" className="px-6 text-base font-semibold" asChild>
            <a href="/login">Start creating</a>
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="px-6 text-base"
            asChild
          >
            <a href="#features">See how it works</a>
          </Button>
        </motion.div>

        {/* Realistic editor mockup */}
        <motion.div
          className="mt-20 rounded-[22px] border border-border bg-card shadow-2xl overflow-hidden max-w-4xl mx-auto"
          initial={{ opacity: 0, y: 40, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.9, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* Title bar */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/30">
            <span className="h-3 w-3 rounded-full bg-red-400/80" />
            <span className="h-3 w-3 rounded-full bg-yellow-400/80" />
            <span className="h-3 w-3 rounded-full bg-green-400/80" />
            <span className="ml-3 text-xs text-muted-foreground font-medium">
              Canvas Studio — Q1 Campaign
            </span>
          </div>

          {/* Editor body */}
          <div className="flex h-[320px] sm:h-[420px]">
            {/* Left sidebar — AI chat */}
            <div className="hidden sm:flex w-64 border-r border-border flex-col bg-card">
              {/* Chat header */}
              <div className="px-3 py-2.5 border-b border-border flex items-center gap-2">
                <MessageSquare className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs font-medium text-foreground">
                  AI Chat
                </span>
              </div>
              {/* Chat messages */}
              <div className="flex-1 p-3 space-y-3 overflow-hidden">
                {/* User message */}
                <div className="flex justify-end">
                  <div className="bg-primary/10 rounded-lg rounded-tr-sm px-3 py-2 text-xs text-foreground max-w-[85%]">
                    Create a modern social post about our product launch
                  </div>
                </div>
                {/* AI response */}
                <div className="flex justify-start">
                  <div className="bg-muted rounded-lg rounded-tl-sm px-3 py-2 text-xs text-muted-foreground max-w-[85%]">
                    Here's a design with a gradient hero section, bold
                    typography, and a call-to-action...
                  </div>
                </div>
                {/* User message */}
                <div className="flex justify-end">
                  <div className="bg-primary/10 rounded-lg rounded-tr-sm px-3 py-2 text-xs text-foreground max-w-[85%]">
                    Make it more minimal, use our brand colors
                  </div>
                </div>
                {/* AI response */}
                <div className="flex justify-start">
                  <div className="bg-muted rounded-lg rounded-tl-sm px-3 py-2 text-xs text-muted-foreground max-w-[85%]">
                    Updated! Clean layout with your brand palette applied.
                  </div>
                </div>
              </div>
              {/* Chat input */}
              <div className="px-3 py-2.5 border-t border-border">
                <div className="rounded-lg border border-border bg-background px-3 py-2 text-xs text-muted-foreground">
                  Ask AI to generate...
                </div>
              </div>
            </div>

            {/* Main canvas area */}
            <div className="flex-1 bg-muted/20 p-4 sm:p-6 flex flex-col">
              {/* Toolbar */}
              <div className="flex items-center gap-2 mb-4">
                <div className="flex items-center gap-1 rounded-lg border border-border bg-card px-2 py-1">
                  <Layers className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-[10px] text-muted-foreground font-medium">
                    Slide 1/3
                  </span>
                </div>
                <div className="flex items-center gap-1 rounded-lg border border-border bg-card px-2 py-1">
                  <Image className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-[10px] text-muted-foreground font-medium">
                    1080 × 1080
                  </span>
                </div>
              </div>

              {/* Canvas — the actual "slide" */}
              <div className="flex-1 rounded-xl border border-border bg-background shadow-sm flex flex-col items-center justify-center p-6 sm:p-8 gap-4 relative overflow-hidden">
                {/* Fake social post content */}
                <div className="absolute top-0 left-0 right-0 h-1/3 bg-gradient-to-br from-primary/15 via-secondary/10 to-transparent" />
                <div className="relative z-10 flex flex-col items-center gap-3 max-w-[260px]">
                  <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center">
                    <Sparkles className="h-5 w-5 text-primary" />
                  </div>
                  <div className="h-3 w-40 rounded-full bg-foreground/80" />
                  <div className="h-2 w-52 rounded-full bg-muted-foreground/30" />
                  <div className="h-2 w-36 rounded-full bg-muted-foreground/30" />
                  <div className="mt-2 h-8 w-28 rounded-lg bg-primary/80" />
                </div>
              </div>
            </div>

            {/* Right panel — slides */}
            <div className="hidden lg:flex w-48 border-l border-border flex-col bg-card">
              <div className="px-3 py-2.5 border-b border-border">
                <span className="text-xs font-medium text-foreground">
                  Slides
                </span>
              </div>
              <div className="p-2 space-y-2 overflow-hidden">
                {/* Slide thumbnails */}
                <div className="rounded-lg border-2 border-primary bg-background p-1 aspect-square flex items-center justify-center">
                  <div className="text-[8px] text-muted-foreground">1</div>
                </div>
                <div className="rounded-lg border border-border bg-background p-1 aspect-square flex items-center justify-center opacity-60">
                  <div className="text-[8px] text-muted-foreground">2</div>
                </div>
                <div className="rounded-lg border border-border bg-background p-1 aspect-square flex items-center justify-center opacity-40">
                  <div className="text-[8px] text-muted-foreground">3</div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
