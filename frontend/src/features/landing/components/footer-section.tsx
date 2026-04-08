"use client";

import { motion } from "framer-motion";
import { ease, fadeUp, staggerContainer } from "../lib/animations";

const PRODUCT_LINKS = [
  { label: "Features", href: "#features" },
  { label: "How it Works", href: "#how-it-works" },
  { label: "Pricing", href: "#pricing" },
] as const;

const RESOURCES_LINKS = [
  { label: "Documentation", href: "#" },
  { label: "API Reference", href: "#" },
] as const;

const COMPANY_LINKS = [
  { label: "About", href: "#" },
  { label: "Contact", href: "#" },
] as const;

function LinkColumn({
  heading,
  links,
}: Readonly<{
  heading: string;
  links: ReadonlyArray<{ label: string; href: string }>;
}>) {
  return (
    <div>
      <p className="text-[11px] font-bold text-black uppercase tracking-widest mb-3">
        {heading}
      </p>
      <ul className="space-y-2 flex flex-col">
        {links.map(({ label, href }) => (
          <li key={label}>
            <a
              href={href}
              className="text-sm text-[#555] font-medium hover:text-black hover:bg-brutal-yellow px-1 rounded transition-colors duration-150"
            >
              {label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function FooterSection() {
  return (
    <motion.footer
      className="border-t-2 border-black py-14 bg-white"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, ease }}
    >
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex flex-col sm:flex-row justify-between gap-10">
          <div>
            <p className="font-display font-extrabold text-xl tracking-tight text-black">
              Plurist
            </p>
            <p className="text-sm text-[#555] mt-1.5 font-medium">
              Content from code.
            </p>
          </div>
          <motion.div
            className="flex gap-14"
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            <motion.div variants={fadeUp}>
              <LinkColumn heading="Product" links={PRODUCT_LINKS} />
            </motion.div>
            <motion.div variants={fadeUp}>
              <LinkColumn heading="Resources" links={RESOURCES_LINKS} />
            </motion.div>
            <motion.div variants={fadeUp}>
              <LinkColumn heading="Company" links={COMPANY_LINKS} />
            </motion.div>
          </motion.div>
        </div>

        <div className="mt-10 pt-6 border-t-2 border-black flex flex-col sm:flex-row justify-between items-center gap-3">
          <p className="text-xs text-[#555] font-medium">
            &copy; 2026 Plurist. All rights reserved.
          </p>
          <div />
        </div>
      </div>
    </motion.footer>
  );
}
