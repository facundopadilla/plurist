"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import {
  Code,
  Download,
  GripVertical,
  Layers,
  MessageSquare,
  Palette,
  Puzzle,
} from "lucide-react";
import { ease, fadeUp, staggerContainer } from "../lib/animations";

const FEATURES = [
  { icon: Palette, text: "High-level visual canvas for drag-and-drop design" },
  { icon: Code, text: "Low-level code editor for HTML/CSS precision" },
  { icon: Layers, text: "Multi-slide campaigns with variant generation" },
  { icon: MessageSquare, text: "Real-time AI chat built into the editor" },
  {
    icon: Puzzle,
    text: "Install skills to unlock new templates and workflows",
  },
  { icon: Download, text: "Export to PNG, JPEG, WebP, or reuse as templates" },
] as const;

export function EditorPreviewSection() {
  const mockupRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: mockupRef,
    offset: ["start end", "end start"],
  });
  const rotateX = useTransform(scrollYProgress, [0, 0.5, 1], [4, 0, -4]);
  const scale = useTransform(scrollYProgress, [0, 0.5], [0.95, 1]);

  return (
    <section className="py-24 sm:py-32 bg-white border-b-2 border-black">
      <div className="flex flex-col lg:flex-row items-center gap-14 max-w-6xl mx-auto px-6">
        {/* Left */}
        <motion.div
          className="lg:w-1/2"
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, ease }}
        >
          <p className="font-mono text-xs uppercase tracking-wider text-black font-bold mb-2">
            Code-first editor
          </p>
          <h2 className="font-display font-extrabold text-[32px] sm:text-[48px] lg:text-[56px] leading-[1.05] tracking-[-0.04em] text-black">
            Two editors, one workflow.
            <br />
            <span className="text-[#555]">Visual or code — you choose.</span>
          </h2>
          <p className="text-[#555] leading-relaxed mt-4 text-base font-medium">
            Everything you create is HTML and CSS under the hood — websites,
            landing pages, social posts, slides.
          </p>

          <motion.ul
            className="space-y-3 mt-7"
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {FEATURES.map(({ icon: Icon, text }) => (
              <motion.li
                key={text}
                className="flex items-center gap-2.5"
                variants={fadeUp}
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded border-2 border-black bg-brutal-yellow">
                  <Icon className="h-3.5 w-3.5 text-black" />
                </span>
                <span className="text-black text-sm font-medium">{text}</span>
              </motion.li>
            ))}
          </motion.ul>

          <motion.div
            className="mt-8"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.3, delay: 0.5 }}
          >
            <motion.a
              href="/compose"
              className="brutal-btn bg-brutal-yellow text-black rounded-lg px-6 py-2.5 text-sm inline-flex"
              whileHover={{ x: -2, y: -2 }}
              whileTap={{ x: 2, y: 2 }}
              transition={{ duration: 0.15 }}
            >
              Try the editor
            </motion.a>
          </motion.div>
        </motion.div>

        {/* Right — split code/visual mockup */}
        <motion.div
          ref={mockupRef}
          className="lg:w-1/2 w-full"
          initial={{ opacity: 0, x: 30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, ease }}
          style={{ rotateX, scale, transformPerspective: 1200 }}
        >
          <div
            className="relative rounded-xl border-3 border-black bg-white overflow-hidden"
            style={{ boxShadow: "8px 8px 0 0 #000" }}
          >
            {/* Title bar */}
            <div className="flex items-center gap-2 border-b-2 border-black px-4 py-2.5 bg-brutal-pastel-purple">
              <span className="h-3 w-3 rounded-full bg-black" />
              <span className="h-3 w-3 rounded-full bg-black opacity-40" />
              <span className="h-3 w-3 rounded-full bg-black opacity-20" />
              <span className="ml-3 text-[11px] text-black font-bold tracking-wide uppercase">
                plurist — code studio
              </span>
            </div>

            {/* Split view: code + visual */}
            <div className="flex h-[360px]">
              {/* Code editor pane */}
              <div className="flex-1 bg-[#1a1a2e] p-4 font-mono text-[11px] leading-[1.6] overflow-hidden border-r-2 border-black">
                <div className="space-y-0.5">
                  <p>
                    <span className="text-[#ff6b6b]">&lt;section</span>{" "}
                    <span className="text-[#74b9ff]">class</span>
                    <span className="text-[#dfe6e9]">=&quot;</span>
                    <span className="text-[#88d498]">hero</span>
                    <span className="text-[#dfe6e9]">&quot;</span>
                    <span className="text-[#ff6b6b]">&gt;</span>
                  </p>
                  <p className="pl-4">
                    <span className="text-[#ff6b6b]">&lt;h1</span>{" "}
                    <span className="text-[#74b9ff]">class</span>
                    <span className="text-[#dfe6e9]">=&quot;</span>
                    <span className="text-[#88d498]">title</span>
                    <span className="text-[#dfe6e9]">&quot;</span>
                    <span className="text-[#ff6b6b]">&gt;</span>
                  </p>
                  <p className="pl-8 text-[#dfe6e9]">Launch your product</p>
                  <p className="pl-4">
                    <span className="text-[#ff6b6b]">&lt;/h1&gt;</span>
                  </p>
                  <p className="pl-4">
                    <span className="text-[#ff6b6b]">&lt;p</span>{" "}
                    <span className="text-[#74b9ff]">class</span>
                    <span className="text-[#dfe6e9]">=&quot;</span>
                    <span className="text-[#88d498]">subtitle</span>
                    <span className="text-[#dfe6e9]">&quot;</span>
                    <span className="text-[#ff6b6b]">&gt;</span>
                  </p>
                  <p className="pl-8 text-[#dfe6e9]">Build, publish, grow.</p>
                  <p className="pl-4">
                    <span className="text-[#ff6b6b]">&lt;/p&gt;</span>
                  </p>
                  <p className="pl-4">
                    <span className="text-[#ff6b6b]">&lt;button</span>{" "}
                    <span className="text-[#74b9ff]">class</span>
                    <span className="text-[#dfe6e9]">=&quot;</span>
                    <span className="text-[#88d498]">cta</span>
                    <span className="text-[#dfe6e9]">&quot;</span>
                    <span className="text-[#ff6b6b]">&gt;</span>
                  </p>
                  <p className="pl-8 text-[#dfe6e9]">Get started</p>
                  <p className="pl-4">
                    <span className="text-[#ff6b6b]">&lt;/button&gt;</span>
                  </p>
                  <p>
                    <span className="text-[#ff6b6b]">&lt;/section&gt;</span>
                  </p>
                  <p className="mt-3">
                    <span className="text-[#ffd23f]">.hero</span>
                    <span className="text-[#dfe6e9]">{" {"}</span>
                  </p>
                  <p className="pl-4">
                    <span className="text-[#74b9ff]">display</span>
                    <span className="text-[#dfe6e9]">: </span>
                    <span className="text-[#88d498]">flex</span>
                    <span className="text-[#dfe6e9]">;</span>
                  </p>
                  <p className="pl-4">
                    <span className="text-[#74b9ff]">align-items</span>
                    <span className="text-[#dfe6e9]">: </span>
                    <span className="text-[#88d498]">center</span>
                    <span className="text-[#dfe6e9]">;</span>
                  </p>
                  <p>
                    <span className="text-[#dfe6e9]">{"}"}</span>
                  </p>
                </div>
              </div>

              {/* Divider */}
              <div className="w-4 bg-brutal-yellow border-x-0 flex items-center justify-center shrink-0">
                <GripVertical className="h-4 w-4 text-black" />
              </div>

              {/* Visual preview pane */}
              <div className="flex-1 p-4 bg-brutal-bg brutal-grid-bg flex items-center justify-center">
                <div
                  className="w-full max-w-[200px] rounded border-2 border-black bg-white p-5 flex flex-col items-center gap-2"
                  style={{ boxShadow: "3px 3px 0 0 #000" }}
                >
                  <div className="flex flex-col items-center gap-2 text-center">
                    <div className="h-2 w-24 rounded-sm bg-black" />
                    <div className="h-1 w-20 rounded-sm bg-black opacity-30" />
                    <div
                      className="mt-2 h-6 w-16 rounded border-2 border-black bg-brutal-yellow"
                      style={{ boxShadow: "2px 2px 0 0 #000" }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
