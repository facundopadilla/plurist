import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { Button, Chip } from "@heroui/react";
import { ArrowRight, Sparkles, Zap, Users, BarChart3 } from "lucide-react";
import { ease, fadeUp, stagger } from "../lib/animations";

const stats = [
  { icon: Zap, value: "10K+", label: "Posts created" },
  { icon: Users, value: "500+", label: "Teams" },
  { icon: BarChart3, value: "3×", label: "More engagement" },
];

function ProductMockup() {
  return (
    <div className="relative w-full overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-2xl shadow-indigo-100/60">
      {/* App header */}
      <div className="flex items-center gap-2 border-b border-neutral-100 bg-neutral-50 px-4 py-3">
        <div className="flex gap-1.5">
          <div className="h-3 w-3 rounded-full bg-red-400" />
          <div className="h-3 w-3 rounded-full bg-amber-400" />
          <div className="h-3 w-3 rounded-full bg-green-400" />
        </div>
        <div className="mx-auto flex items-center gap-2 rounded-md bg-white px-3 py-1 text-[11px] text-neutral-400 shadow-sm ring-1 ring-neutral-200">
          <span className="h-2 w-2 rounded-full bg-indigo-500" />
          plurist.app/compose
        </div>
      </div>

      {/* App layout */}
      <div className="flex min-h-[360px]">
        {/* Sidebar */}
        <div className="hidden w-[180px] flex-shrink-0 border-r border-neutral-100 bg-neutral-50 p-3 sm:block">
          <div className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
            Queue
          </div>
          {[
            "Instagram Post",
            "LinkedIn Article",
            "Twitter Thread",
            "TikTok Script",
          ].map((item, i) => (
            <div
              key={item}
              className={`mb-1.5 flex items-center gap-2 rounded-lg px-2.5 py-2 text-[11px] ${
                i === 0
                  ? "bg-indigo-500 font-semibold text-white"
                  : "text-neutral-600 hover:bg-neutral-100"
              }`}
            >
              <div
                className={`h-2 w-2 flex-shrink-0 rounded-full ${
                  i === 0
                    ? "bg-white"
                    : i === 1
                      ? "bg-blue-400"
                      : i === 2
                        ? "bg-sky-400"
                        : "bg-pink-400"
                }`}
              />
              {item}
            </div>
          ))}
        </div>

        {/* Main content */}
        <div className="flex-1 p-4">
          {/* AI Generation area */}
          <div className="mb-3 rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-violet-50 p-3">
            <div className="mb-2 flex items-center gap-2">
              <Sparkles size={12} className="text-indigo-500" />
              <span className="text-[11px] font-semibold text-indigo-700">
                AI Generated — GPT-4o
              </span>
            </div>
            <p className="text-[12px] leading-relaxed text-neutral-700">
              🚀 Big news! We just hit a major milestone — 10,000 posts created
              on Plurist! Thank you to every creator who trusted us with their
              social media strategy. Here&apos;s to the next 10K! ✨
            </p>
            <div className="mt-2 flex gap-2">
              {["Regenerate", "Variations"].map((a) => (
                <div
                  key={a}
                  className="rounded-md bg-white px-2.5 py-1 text-[10px] font-medium text-indigo-600 shadow-sm ring-1 ring-indigo-100"
                >
                  {a}
                </div>
              ))}
            </div>
          </div>

          {/* Platform previews */}
          <div className="flex gap-2">
            {["IG", "LinkedIn", "X"].map((platform, i) => (
              <div
                key={platform}
                className={`flex-1 rounded-lg border p-2.5 ${
                  i === 0
                    ? "border-pink-200 bg-pink-50"
                    : i === 1
                      ? "border-blue-200 bg-blue-50"
                      : "border-neutral-200 bg-neutral-50"
                }`}
              >
                <div className="mb-1 text-[9px] font-bold uppercase tracking-wider text-neutral-500">
                  {platform}
                </div>
                <div className="space-y-1">
                  <div className="h-1.5 w-full rounded bg-neutral-200" />
                  <div className="h-1.5 w-3/4 rounded bg-neutral-200" />
                  <div className="h-1.5 w-1/2 rounded bg-neutral-200" />
                </div>
              </div>
            ))}
          </div>

          {/* Schedule bar */}
          <div className="mt-3 flex items-center justify-between rounded-lg bg-neutral-50 px-3 py-2 ring-1 ring-neutral-200">
            <div className="flex items-center gap-2">
              <div className="h-5 w-5 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500" />
              <span className="text-[11px] text-neutral-600">
                Scheduled for{" "}
                <span className="font-semibold text-neutral-900">
                  Tomorrow 9:00 AM
                </span>
              </span>
            </div>
            <div className="rounded-md bg-indigo-500 px-2.5 py-1 text-[10px] font-semibold text-white">
              Publish
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function L2HeroSection() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });

  const mockupY = useTransform(scrollYProgress, [0, 1], [0, -60]);
  const mockupOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0.3]);

  return (
    <section
      ref={ref}
      className="relative overflow-hidden pb-16 pt-28 sm:pb-24 sm:pt-36"
    >
      {/* Gradient mesh background */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/4 top-0 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-indigo-100/70 blur-[120px]" />
        <div className="absolute right-1/4 top-20 h-[400px] w-[400px] translate-x-1/2 rounded-full bg-violet-100/70 blur-[100px]" />
        <div className="absolute bottom-0 left-1/2 h-[300px] w-[600px] -translate-x-1/2 rounded-full bg-sky-100/50 blur-[80px]" />
      </div>

      {/* Subtle grid */}
      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(to right, #000 1px, transparent 1px), linear-gradient(to bottom, #000 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
        }}
      />

      <div className="mx-auto max-w-6xl px-6">
        {/* Top badge */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease }}
          className="mb-6 flex justify-center"
        >
          <Chip
            variant="soft"
            className="border border-indigo-100 bg-indigo-50/80 px-3 text-[13px] font-medium text-indigo-700 backdrop-blur-sm"
          >
            <span className="flex items-center gap-1.5">
              <Sparkles size={12} className="text-indigo-500" />
              AI-Powered Social Media Platform
            </span>
          </Chip>
        </motion.div>

        {/* Headline */}
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="visible"
          className="mb-6 text-center"
        >
          <motion.h1
            variants={fadeUp}
            className="text-[44px] font-bold leading-[1.08] tracking-[-0.04em] text-neutral-900 sm:text-[56px] lg:text-[72px]"
          >
            Create content that{" "}
            <span className="bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-600 bg-clip-text text-transparent">
              actually converts
            </span>
          </motion.h1>
          <motion.p
            variants={fadeUp}
            className="mx-auto mt-5 max-w-2xl text-[17px] leading-relaxed text-neutral-500 sm:text-[19px]"
          >
            Plurist combines a visual canvas editor, multi-model AI generation,
            and smart scheduling — so your team spends less time writing and
            more time growing.
          </motion.p>
        </motion.div>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5, ease }}
          className="mb-12 flex flex-col items-center justify-center gap-3 sm:flex-row"
        >
          <a href="/login" className="w-full sm:w-auto">
            <Button
              size="lg"
              className="w-full rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 px-8 font-semibold text-white shadow-lg shadow-indigo-200/70 transition-opacity hover:opacity-90"
            >
              <span className="flex items-center gap-2">
                Start for free <ArrowRight size={16} />
              </span>
            </Button>
          </a>
          <Button
            variant="outline"
            size="lg"
            className="w-full rounded-xl border-neutral-200 px-8 font-medium text-neutral-700 hover:border-neutral-300 hover:bg-neutral-50 sm:w-auto"
          >
            View demo
          </Button>
        </motion.div>

        {/* Product mockup */}
        <motion.div
          style={{ y: mockupY, opacity: mockupOpacity }}
          initial={{ opacity: 0, y: 40, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.5, duration: 0.8, ease }}
          className="relative mx-auto max-w-4xl"
        >
          <ProductMockup />

          {/* Floating badges */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 1, duration: 0.5 }}
            className="absolute -left-4 top-16 hidden rounded-xl border border-indigo-100 bg-white px-3 py-2.5 shadow-lg sm:block"
          >
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-400 to-violet-500">
                <Sparkles size={13} className="text-white" />
              </div>
              <div>
                <div className="text-[11px] font-semibold text-neutral-800">
                  AI Generated
                </div>
                <div className="text-[10px] text-neutral-500">
                  3 variations ready
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 1.1, duration: 0.5 }}
            className="absolute -right-4 bottom-16 hidden rounded-xl border border-green-100 bg-white px-3 py-2.5 shadow-lg sm:block"
          >
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-green-100">
                <div className="h-2.5 w-2.5 animate-pulse rounded-full bg-green-500" />
              </div>
              <div>
                <div className="text-[11px] font-semibold text-neutral-800">
                  Published
                </div>
                <div className="text-[10px] text-neutral-500">
                  2 min ago · 4 platforms
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.5, ease }}
          className="mt-10 flex flex-wrap items-center justify-center gap-8 border-t border-neutral-100 pt-10 sm:gap-14"
        >
          {stats.map(({ icon: Icon, value, label }) => (
            <div key={label} className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50">
                <Icon size={17} className="text-indigo-500" />
              </div>
              <div>
                <div className="text-[20px] font-bold tracking-tight text-neutral-900">
                  {value}
                </div>
                <div className="text-[12px] text-neutral-500">{label}</div>
              </div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
