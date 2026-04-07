import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { Sparkles, GripVertical, MessageSquare } from "lucide-react";
import {
  fadeUp,
  stagger,
  slideFromLeft,
  slideFromRight,
  sectionScaleIn,
} from "../lib/animations";
import { CyclingText } from "./cycling-text";

function CodePane() {
  return (
    <div className="flex-1 overflow-hidden bg-[#08080a] p-4 font-mono text-[11px] leading-[1.8] sm:p-5 sm:text-[11.5px] sm:leading-[1.9] lg:border-r lg:border-zinc-800/50">
      {/* Line numbers + code */}
      <div className="space-y-px">
        {[
          {
            num: 1,
            content: (
              <>
                <span className="text-rose-400/70">&lt;section</span>{" "}
                <span className="text-sky-400/60">class</span>=
                <span className="text-emerald-400/60">&quot;hero&quot;</span>
                <span className="text-rose-400/70">&gt;</span>
              </>
            ),
          },
          {
            num: 2,
            content: (
              <>
                &nbsp;&nbsp;<span className="text-rose-400/70">&lt;div</span>{" "}
                <span className="text-sky-400/60">class</span>=
                <span className="text-emerald-400/60">
                  &quot;container&quot;
                </span>
                <span className="text-rose-400/70">&gt;</span>
              </>
            ),
          },
          {
            num: 3,
            content: (
              <>
                &nbsp;&nbsp;&nbsp;&nbsp;
                <span className="text-rose-400/70">&lt;h1&gt;</span>
                <span className="text-zinc-200">Launch your brand</span>
                <span className="text-rose-400/70">&lt;/h1&gt;</span>
              </>
            ),
          },
          {
            num: 4,
            content: (
              <>
                &nbsp;&nbsp;&nbsp;&nbsp;
                <span className="text-rose-400/70">&lt;p</span>{" "}
                <span className="text-sky-400/60">class</span>=
                <span className="text-emerald-400/60">&quot;lead&quot;</span>
                <span className="text-rose-400/70">&gt;</span>
              </>
            ),
          },
          {
            num: 5,
            content: (
              <>
                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                <span className="text-zinc-300">Design at the speed of</span>
              </>
            ),
          },
          {
            num: 6,
            content: (
              <>
                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                <span className="text-zinc-300">thought.</span>
              </>
            ),
          },
          {
            num: 7,
            content: (
              <>
                &nbsp;&nbsp;&nbsp;&nbsp;
                <span className="text-rose-400/70">&lt;/p&gt;</span>
              </>
            ),
          },
          {
            num: 8,
            content: (
              <>
                &nbsp;&nbsp;&nbsp;&nbsp;
                <span className="text-rose-400/70">&lt;a</span>{" "}
                <span className="text-sky-400/60">href</span>=
                <span className="text-emerald-400/60">&quot;#start&quot;</span>{" "}
                <span className="text-sky-400/60">class</span>=
                <span className="text-emerald-400/60">&quot;btn&quot;</span>
                <span className="text-rose-400/70">&gt;</span>
              </>
            ),
          },
          {
            num: 9,
            content: (
              <>
                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                <span className="text-zinc-200">Get started →</span>
              </>
            ),
          },
          {
            num: 10,
            content: (
              <>
                &nbsp;&nbsp;&nbsp;&nbsp;
                <span className="text-rose-400/70">&lt;/a&gt;</span>
              </>
            ),
          },
          {
            num: 11,
            content: (
              <>
                &nbsp;&nbsp;
                <span className="text-rose-400/70">&lt;/div&gt;</span>
              </>
            ),
          },
          {
            num: 12,
            content: (
              <>
                <span className="text-rose-400/70">&lt;/section&gt;</span>
              </>
            ),
          },
          { num: 13, content: <></> },
          {
            num: 14,
            content: (
              <>
                <span className="text-amber-300/80">.hero</span>{" "}
                <span className="text-zinc-300">{"{"}</span>
              </>
            ),
          },
          {
            num: 15,
            content: (
              <>
                &nbsp;&nbsp;<span className="text-sky-300/80">display</span>
                <span className="text-zinc-300">:</span>{" "}
                <span className="text-emerald-300/80">grid</span>
                <span className="text-zinc-300">;</span>
              </>
            ),
          },
          {
            num: 16,
            content: (
              <>
                &nbsp;&nbsp;<span className="text-sky-300/80">place-items</span>
                <span className="text-zinc-300">:</span>{" "}
                <span className="text-emerald-300/80">center</span>
                <span className="text-zinc-300">;</span>
              </>
            ),
          },
          {
            num: 17,
            content: (
              <>
                &nbsp;&nbsp;<span className="text-sky-300/80">min-height</span>
                <span className="text-zinc-300">:</span>{" "}
                <span className="text-amber-300/80">100dvh</span>
                <span className="text-zinc-300">;</span>
              </>
            ),
          },
          {
            num: 18,
            content: (
              <>
                <span className="text-zinc-300">{"}"}</span>
              </>
            ),
          },
        ].map(({ num, content }) => (
          <div key={num} className="flex">
            <span className="w-7 shrink-0 select-none pr-3 text-right text-white/35">
              {num}
            </span>
            <span className="text-zinc-200">{content}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PreviewPane() {
  return (
    <div className="flex flex-1 flex-col bg-[#0d0d10]">
      {/* Mini toolbar */}
      <div className="flex items-center gap-2 border-b border-zinc-800/40 px-3 py-2">
        <div className="flex gap-1">
          <div className="h-5 w-5 rounded bg-zinc-800 flex items-center justify-center">
            <Sparkles size={10} className="text-zinc-300" />
          </div>
          <div className="h-5 w-5 rounded bg-zinc-800 flex items-center justify-center">
            <MessageSquare size={10} className="text-zinc-300" />
          </div>
        </div>
        <span className="ml-auto font-mono text-[9px] uppercase tracking-[0.14em] text-zinc-300">
          Preview
        </span>
      </div>

      {/* Visual preview area */}
      <div className="flex flex-1 items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-[280px] sm:max-w-[240px]">
          {/* Rendered card preview */}
          <div className="rounded-xl border border-zinc-800/50 bg-gradient-to-b from-zinc-900/80 to-zinc-900/40 p-6 sm:p-8 backdrop-blur-sm">
            <div className="space-y-4 text-center">
              {/* Title bar */}
              <div className="mx-auto h-3 w-36 rounded-sm bg-zinc-100" />
              {/* Subtitle lines */}
              <div className="space-y-1.5">
                <div className="mx-auto h-1.5 w-28 rounded-sm bg-zinc-600/50" />
                <div className="mx-auto h-1.5 w-20 rounded-sm bg-zinc-700/40" />
              </div>
              {/* CTA button */}
              <div className="mx-auto mt-3 h-8 w-24 rounded-lg bg-zinc-50 flex items-center justify-center">
                <span className="text-[9px] font-semibold text-zinc-900">
                  Get started →
                </span>
              </div>
            </div>
          </div>

          {/* AI chat bubble below preview */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.8, duration: 0.5 }}
            className="mt-4 rounded-lg border border-zinc-800/40 bg-zinc-900/50 px-3 py-2"
          >
            <div className="flex items-center gap-2">
              <Sparkles size={10} className="text-violet-400/70 shrink-0" />
              <span className="font-mono text-[9px] leading-snug text-zinc-100">
                "Make the heading bolder and add a gradient background"
              </span>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

export function EditorSection() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const rotateX = useTransform(scrollYProgress, [0, 0.35, 1], [8, 0, -2]);
  const mockupScale = useTransform(scrollYProgress, [0, 0.35], [0.88, 1]);
  const mockupOpacity = useTransform(scrollYProgress, [0, 0.2], [0, 1]);

  return (
    <section
      id="editor"
      className="relative scroll-mt-28 overflow-hidden px-6 py-32"
    >
      <div className="absolute left-1/2 top-0 h-px w-2/3 max-w-xl -translate-x-1/2 bg-gradient-to-r from-transparent via-zinc-700/30 to-transparent" />

      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-80px" }}
        variants={sectionScaleIn}
        className="mx-auto max-w-6xl"
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
            Editor
          </motion.span>
          <motion.h2
            variants={fadeUp}
            className="mt-4 text-[clamp(1.8rem,4vw,3rem)] font-bold tracking-[-0.03em] text-zinc-50"
          >
            <CyclingText words={["Code", "Chat", "AI"]} interval={2000} /> on
            the left.{" "}
            <span className="text-zinc-200">Canvas on the right.</span>
          </motion.h2>
          <motion.p
            variants={fadeUp}
            className="mx-auto mt-4 max-w-md text-[15px] leading-7 text-zinc-200"
          >
            Write HTML & CSS. See the result live. Ask AI to iterate. Everything
            in one split view.
          </motion.p>
        </motion.div>

        {/* Mockup */}
        <motion.div
          ref={ref}
          style={{
            rotateX,
            scale: mockupScale,
            opacity: mockupOpacity,
            transformPerspective: 1200,
          }}
          className="mt-14 sm:mt-16"
        >
          <div className="relative mx-auto max-w-5xl">
            {/* Ambilight behind mockup */}
            <div
              className="absolute -inset-8 rounded-[32px] opacity-30 blur-[80px]"
              style={{
                background:
                  "conic-gradient(from 90deg, #c084fc22, #22d3ee22, #f472b622, #c084fc22)",
                animation: "l3-spin 15s linear infinite",
              }}
            />

            <div className="relative overflow-hidden rounded-2xl border border-zinc-700/30 bg-[#0a0a0c] shadow-[0_50px_100px_rgba(0,0,0,0.7)]">
              {/* Title bar */}
              <div className="flex items-center gap-2 border-b border-zinc-800/60 px-4 py-3">
                <div className="flex gap-1.5">
                  <div className="h-3 w-3 rounded-full bg-[#ff5f57]" />
                  <div className="h-3 w-3 rounded-full bg-[#febc2e]" />
                  <div className="h-3 w-3 rounded-full bg-[#28c840]" />
                </div>
                <div className="ml-3 flex gap-1">
                  <span className="rounded border-b border-zinc-600/30 bg-zinc-800/80 px-2.5 py-0.5 font-mono text-[9px] text-zinc-200">
                    index.html
                  </span>
                  <span className="rounded px-2.5 py-0.5 font-mono text-[9px] text-zinc-300">
                    style.css
                  </span>
                </div>
                <span className="ml-auto font-mono text-[9px] uppercase tracking-[0.14em] text-zinc-300">
                  Canvas Studio
                </span>
              </div>

              {/* Split editor */}
              <div className="flex min-h-[560px] flex-col lg:h-[420px] lg:min-h-0 lg:flex-row">
                <motion.div
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  variants={slideFromLeft}
                  className="flex flex-1"
                >
                  <CodePane />
                </motion.div>

                {/* Drag handle */}
                <div className="flex h-3 shrink-0 items-center justify-center bg-zinc-800/30 lg:h-auto lg:w-3">
                  <GripVertical
                    size={12}
                    className="hidden text-white/35 lg:block"
                  />
                  <div className="h-px w-12 bg-white/15 lg:hidden" />
                </div>

                <motion.div
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  variants={slideFromRight}
                  className="flex flex-1"
                >
                  <PreviewPane />
                </motion.div>
              </div>

              {/* Bottom status bar */}
              <div className="flex flex-col gap-1 border-t border-zinc-800/50 px-4 py-2 sm:flex-row sm:items-center sm:justify-between sm:gap-0 sm:py-1.5">
                <span className="font-mono text-[9px] text-zinc-300">
                  HTML · UTF-8
                </span>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-[9px] text-zinc-300">
                    Ln 3, Col 12
                  </span>
                  <span className="font-mono text-[9px] text-emerald-500/60">
                    ● Connected
                  </span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}
