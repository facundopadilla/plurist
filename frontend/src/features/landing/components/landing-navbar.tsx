"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { ease } from "../lib/animations";

const NAV_LINKS = [
  { label: "Features", href: "#features" },
  { label: "How it Works", href: "#how-it-works" },
  { label: "Pricing", href: "#pricing" },
];

export function LandingNavbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("");

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const sectionIds = NAV_LINKS.map((l) => l.href.slice(1));
    const visible = new Set<string>();

    const handleChange = () => {
      const active = sectionIds.find((id) => visible.has(id));
      setActiveSection(active ? `#${active}` : "");
    };

    const observers = sectionIds.map((id) => {
      const el = document.getElementById(id);
      if (!el) return null;
      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            visible.add(id);
          } else {
            visible.delete(id);
          }
          handleChange();
        },
        { rootMargin: "-80px 0px -40% 0px" },
      );
      obs.observe(el);
      return obs;
    });

    return () => observers.forEach((o) => o?.disconnect());
  }, []);

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-200",
        scrolled
          ? "bg-brutal-bg border-b-2 border-black"
          : "bg-transparent border-b border-transparent",
      )}
    >
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
        <a
          href="/"
          className="font-display font-extrabold text-xl tracking-tight text-black"
        >
          Plurist
        </a>

        <nav className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map(({ label, href }) => (
            <a
              key={href}
              href={href}
              className={cn(
                "px-3 py-1.5 text-sm font-semibold transition-colors duration-150 rounded",
                activeSection === href
                  ? "bg-brutal-yellow text-black"
                  : "text-black hover:bg-brutal-yellow",
              )}
            >
              {label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <a
            href="/login"
            className="hidden md:inline-block text-sm font-semibold text-black px-3 py-1.5 hover:bg-black hover:text-white transition-colors duration-150 rounded"
          >
            Log in
          </a>
          <a
            href="/login"
            className="hidden md:inline-flex brutal-btn bg-brutal-yellow text-black rounded px-4 py-1.5 text-sm"
          >
            Get Started
          </a>
          <button
            type="button"
            onClick={() => setMobileOpen((p) => !p)}
            className="md:hidden h-8 w-8 flex items-center justify-center border-2 border-black rounded bg-white"
            aria-label="Toggle menu"
          >
            {mobileOpen ? (
              <X className="h-4 w-4" />
            ) : (
              <Menu className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            key="mobile-menu"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease }}
            className="md:hidden overflow-hidden bg-brutal-bg border-b-2 border-black"
          >
            <div className="px-6 py-4 flex flex-col gap-1">
              {NAV_LINKS.map(({ label, href }) => (
                <a
                  key={href}
                  href={href}
                  onClick={() => setMobileOpen(false)}
                  className="block py-2.5 text-base font-semibold text-black hover:bg-brutal-yellow px-2 rounded transition-colors duration-150"
                >
                  {label}
                </a>
              ))}
              <div className="mt-3 pt-3 border-t-2 border-black flex flex-col gap-2">
                <a
                  href="/login"
                  onClick={() => setMobileOpen(false)}
                  className="block py-2.5 text-base font-semibold text-black hover:bg-black hover:text-white px-2 rounded transition-colors duration-150"
                >
                  Log in
                </a>
                <a
                  href="/login"
                  onClick={() => setMobileOpen(false)}
                  className="brutal-btn bg-brutal-yellow text-black rounded px-4 py-2.5 text-sm w-full justify-center"
                >
                  Get Started
                </a>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
