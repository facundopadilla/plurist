import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@heroui/react";
import { Menu, X, Sparkles } from "lucide-react";
import { ease } from "../lib/animations";

const navLinks = [
  { label: "Features", href: "#features" },
  { label: "How it works", href: "#how-it-works" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
];

export function L2Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled
          ? "border-b border-neutral-200/60 bg-white/80 backdrop-blur-xl shadow-sm"
          : "bg-transparent"
      }`}
    >
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        {/* Logo */}
        <a href="/landing2" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600">
            <Sparkles size={16} className="text-white" />
          </div>
          <span className="text-[17px] font-bold tracking-tight text-neutral-900">
            Plurist
          </span>
        </a>

        {/* Desktop links */}
        <ul className="hidden items-center gap-7 md:flex">
          {navLinks.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                className="text-[14px] font-medium text-neutral-500 transition-colors hover:text-neutral-900"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>

        {/* Desktop CTA */}
        <div className="hidden items-center gap-3 md:flex">
          <a
            href="/login"
            className="text-[14px] font-medium text-neutral-600 transition-colors hover:text-neutral-900"
          >
            Sign in
          </a>
          <a href="/login">
            <Button
              size="sm"
              className="rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 px-5 font-semibold text-white shadow-md shadow-indigo-200 transition-opacity hover:opacity-90"
            >
              Get started free
            </Button>
          </a>
        </div>

        {/* Mobile hamburger */}
        <button
          className="flex md:hidden"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? (
            <X size={22} className="text-neutral-700" />
          ) : (
            <Menu size={22} className="text-neutral-700" />
          )}
        </button>
      </nav>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22, ease }}
            className="overflow-hidden border-t border-neutral-100 bg-white/95 backdrop-blur-xl md:hidden"
          >
            <div className="flex flex-col gap-1 px-6 py-4">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="py-2 text-[15px] font-medium text-neutral-700 hover:text-neutral-900"
                >
                  {link.label}
                </a>
              ))}
              <div className="mt-3 flex flex-col gap-2 border-t border-neutral-100 pt-3">
                <a
                  href="/login"
                  className="py-2 text-[14px] font-medium text-neutral-600 hover:text-neutral-900"
                >
                  Sign in
                </a>
                <a href="/login">
                  <Button
                    size="sm"
                    className="w-full rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 font-semibold text-white"
                  >
                    Get started free
                  </Button>
                </a>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
