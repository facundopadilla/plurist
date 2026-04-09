import type { Easing, Variants, Transition } from "framer-motion";

export const ease: Easing = [0.22, 1, 0.36, 1];

export const spring: Transition = {
  type: "spring",
  stiffness: 300,
  damping: 35,
  mass: 0.8,
};

/* ── Per-element variants ─────────────────────────────────────── */

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease } },
};

export const fadeScale: Variants = {
  hidden: { opacity: 0, scale: 0.88, y: 16 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 0.6, ease },
  },
};

export const revealClip: Variants = {
  hidden: { clipPath: "inset(15% 0% 15% 0%)", opacity: 0 },
  visible: {
    clipPath: "inset(0% 0% 0% 0%)",
    opacity: 1,
    transition: { duration: 0.9, ease },
  },
};

export const slideFromLeft: Variants = {
  hidden: { opacity: 0, x: -80 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.7, ease } },
};

export const slideFromRight: Variants = {
  hidden: { opacity: 0, x: 80 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.7, ease } },
};

export const scaleRotate: Variants = {
  hidden: { opacity: 0, scale: 0.85, rotate: -2 },
  visible: {
    opacity: 1,
    scale: 1,
    rotate: 0,
    transition: { duration: 0.7, ease },
  },
};

export const blurIn: Variants = {
  hidden: { opacity: 0, filter: "blur(12px)", y: 20 },
  visible: {
    opacity: 1,
    filter: "blur(0px)",
    y: 0,
    transition: { duration: 0.7, ease },
  },
};

/* ── Container stagger variants ───────────────────────────────── */

export const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
};

export const staggerSlow = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.14, delayChildren: 0.15 } },
};

export const staggerFast = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.05, delayChildren: 0.05 } },
};

/* ── Section-level reveal variants (for wrapping entire sections) ── */

export const sectionSlideUp: Variants = {
  hidden: { opacity: 0, y: 72, scale: 0.985, filter: "blur(10px)" },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    filter: "blur(0px)",
    transition: { duration: 0.82, ease },
  },
};

export const sectionSlideLeft: Variants = {
  hidden: { opacity: 0, x: -96, rotate: -1, filter: "blur(10px)" },
  visible: {
    opacity: 1,
    x: 0,
    rotate: 0,
    filter: "blur(0px)",
    transition: { duration: 0.8, ease },
  },
};

export const sectionScaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.94, y: 28, filter: "blur(12px)" },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.86, ease },
  },
};

export const sectionClipReveal: Variants = {
  hidden: {
    clipPath: "inset(10% 5% 10% 5%)",
    opacity: 0,
    y: 36,
    filter: "blur(8px)",
  },
  visible: {
    clipPath: "inset(0% 0% 0% 0%)",
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.96, ease },
  },
};

export const sectionBlurIn: Variants = {
  hidden: { opacity: 0, filter: "blur(20px)", y: 34, scale: 0.992 },
  visible: {
    opacity: 1,
    filter: "blur(0px)",
    y: 0,
    scale: 1,
    transition: { duration: 0.9, ease },
  },
};
