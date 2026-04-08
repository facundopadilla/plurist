import { Code2 } from "lucide-react";

export function AuthShell({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-[#09090b] px-4 py-12 text-zinc-50">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-1/3 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-zinc-500/[0.05] blur-[160px]" />
      </div>

      {/* Dot grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage:
            "radial-gradient(circle, #fafafa 0.6px, transparent 0.6px)",
          backgroundSize: "24px 24px",
        }}
      />

      <div className="relative z-10 w-full max-w-[400px]">
        {/* Logo */}
        <div className="mb-8 flex items-center justify-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-50 text-zinc-900">
            <Code2 size={15} strokeWidth={2.5} />
          </div>
          <span className="text-[15px] font-semibold tracking-[-0.01em] text-zinc-50">
            Plurist
          </span>
        </div>

        {/* Card */}
        <div className="overflow-hidden rounded-2xl border border-zinc-800/50 bg-zinc-900/30 backdrop-blur-xl">
          <div className="p-8">{children}</div>
        </div>

        {/* Footer */}
        <p className="mt-6 text-center font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-500">
          Open source · Self-hostable · MIT
        </p>
      </div>
    </div>
  );
}
