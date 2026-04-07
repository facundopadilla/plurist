import { Code2 } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-zinc-800/50 px-6 py-10">
      <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 sm:flex-row">
        <div className="flex items-center gap-2.5">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-zinc-800 text-zinc-200">
            <Code2 size={11} />
          </div>
          <span className="font-mono text-[11px] tracking-[0.08em] text-zinc-200">
            Plurist · Open Source · MIT
          </span>
        </div>
        <div className="flex items-center gap-6">
          <a
            href="https://github.com/facuolidev/plurist"
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-[11px] tracking-[0.08em] text-zinc-200 transition-colors hover:text-zinc-50"
          >
            GitHub
          </a>
          <a
            href="/login"
            className="font-mono text-[11px] tracking-[0.08em] text-zinc-200 transition-colors hover:text-zinc-50"
          >
            Sign in
          </a>
        </div>
      </div>
    </footer>
  );
}
