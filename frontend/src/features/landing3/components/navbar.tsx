import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Code2, GitHub, Menu, X } from "lucide-react";
import { cn } from "../lib/cn";

const NAV_LINKS = [
  { href: "#features", label: "Features" },
  { href: "#editor", label: "Editor" },
  { href: "#compare", label: "Compare" },
  { href: "#faq", label: "FAQ" },
];

const NAV_OFFSET = 104;

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeHref, setActiveHref] = useState<string>("#features");

  useEffect(() => {
    const sections = NAV_LINKS.map((link) =>
      document.querySelector(link.href),
    ).filter(Boolean) as Element[];

    const onScroll = () => {
      setScrolled(globalThis.scrollY > 40);

      let current: Element | undefined;
      for (let i = sections.length - 1; i >= 0; i -= 1) {
        const section = sections[i];
        const top = section.getBoundingClientRect().top;
        if (top <= NAV_OFFSET + 24) {
          current = section;
          break;
        }
      }

      if (current instanceof HTMLElement && current.id) {
        setActiveHref(`#${current.id}`);
      }
    };

    onScroll();
    globalThis.addEventListener("scroll", onScroll, { passive: true });
    return () => globalThis.removeEventListener("scroll", onScroll);
  }, []);

  const scrollTo = useCallback((href: string) => {
    const el = document.querySelector(href);
    if (el) {
      const top =
        globalThis.scrollY + el.getBoundingClientRect().top - NAV_OFFSET;
      globalThis.scrollTo({ top, behavior: "smooth" });
      setMobileOpen(false);
    }
  }, []);

  return (
    <>
      <motion.nav
        initial={{ y: -40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.7, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="fixed top-0 z-50 w-full px-4 pt-4 sm:px-6"
      >
        <div
          className={cn(
            "mx-auto flex max-w-5xl items-center justify-between rounded-2xl px-5 py-3 transition-all duration-700",
            scrolled
              ? "border border-white/[0.06] bg-[#09090b]/80 shadow-[0_8px_40px_rgba(0,0,0,0.5)] backdrop-blur-2xl"
              : "border border-transparent bg-transparent",
          )}
        >
          <a href="/landing3" className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-50 text-zinc-900">
              <Code2 size={13} strokeWidth={2.5} />
            </div>
            <span className="text-[13px] font-semibold tracking-[-0.01em] text-zinc-50">
              Plurist
            </span>
          </a>

          <div className="hidden items-center gap-1 sm:flex">
            {NAV_LINKS.map((l) => (
              <button
                key={l.href}
                onClick={() => scrollTo(l.href)}
                className={cn(
                  "rounded-lg px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.12em] transition-colors",
                  activeHref === l.href
                    ? "bg-white/[0.08] text-zinc-50"
                    : "text-zinc-200 hover:bg-white/[0.05] hover:text-zinc-50",
                )}
              >
                {l.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <a
              href="https://github.com/facuolidev/plurist"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg p-2 text-zinc-200 transition-colors hover:text-zinc-50"
            >
              <GitHub size={15} />
            </a>
            <a
              href="/login"
              className="hidden rounded-lg bg-zinc-50 px-4 py-1.5 font-mono text-[11px] uppercase tracking-[0.08em] text-zinc-900 transition-all hover:bg-white hover:shadow-[0_0_16px_rgba(250,250,250,0.15)] sm:inline-flex"
            >
              Sign in
            </a>
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="rounded-lg p-2 text-zinc-200 sm:hidden"
            >
              {mobileOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>
      </motion.nav>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-40 flex flex-col items-center justify-center gap-8 bg-[#09090b]/95 backdrop-blur-3xl sm:hidden"
          >
            {NAV_LINKS.map((l) => (
              <button
                key={l.href}
                onClick={() => scrollTo(l.href)}
                className={cn(
                  "font-mono text-sm uppercase tracking-[0.18em] transition-colors",
                  activeHref === l.href
                    ? "text-zinc-50"
                    : "text-zinc-300 hover:text-zinc-50",
                )}
              >
                {l.label}
              </button>
            ))}
            <a
              href="/login"
              className="mt-4 rounded-xl bg-zinc-50 px-8 py-3 font-mono text-xs uppercase tracking-[0.1em] text-zinc-900"
            >
              Sign in
            </a>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
