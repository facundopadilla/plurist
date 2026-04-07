import { useQuery } from "@tanstack/react-query";
import {
  LayoutDashboard,
  Loader2,
  FileText,
  CheckCircle,
  PenLine,
  Sparkles,
  FolderKanban,
  Bot,
  ArrowRight,
} from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { fetchContent } from "../content/api";

function StatCard({
  label,
  value,
  icon,
  note,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  note: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-800/50 bg-zinc-900/30 p-5 backdrop-blur-xl">
      <div className="flex items-center justify-between gap-3">
        <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-zinc-400">
          {label}
        </span>
        <span className="text-zinc-500">{icon}</span>
      </div>
      <p className="mt-4 text-[32px] font-semibold leading-none tracking-[-0.05em] text-zinc-50">
        {value}
      </p>
      <p className="mt-2 text-sm text-zinc-400">{note}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const isCompleted = status === "completed";
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-lg border px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em]",
        isCompleted
          ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
          : "border-zinc-700/50 bg-zinc-800/50 text-zinc-400",
      )}
    >
      {status}
    </span>
  );
}

function QuickLink({
  to,
  title,
  description,
  icon,
}: {
  to: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <Link
      to={to}
      className="group flex items-center justify-between rounded-2xl border border-zinc-800/50 bg-zinc-900/30 p-4 transition-colors hover:bg-white/[0.04]"
    >
      <div className="flex min-w-0 items-start gap-3">
        <span className="mt-0.5 text-zinc-400">{icon}</span>
        <div className="min-w-0">
          <p className="text-sm font-medium text-zinc-100">{title}</p>
          <p className="mt-1 text-sm text-zinc-400">{description}</p>
        </div>
      </div>
      <ArrowRight
        size={16}
        className="shrink-0 text-zinc-500 transition-transform group-hover:translate-x-0.5 group-hover:text-zinc-200"
      />
    </Link>
  );
}

export function DashboardPage() {
  const { data: posts, isLoading } = useQuery({
    queryKey: ["content"],
    queryFn: fetchContent,
  });

  const drafts = posts?.filter((p) => p.status === "draft") ?? [];
  const completed = posts?.filter((p) => p.status === "completed") ?? [];
  const latestPostTitle = posts?.[0]?.title ?? "No content yet";

  const topStats = [
    {
      label: "Total content",
      value: posts?.length ?? 0,
      icon: <FileText size={16} />,
      note: "Everything created in your workspace.",
    },
    {
      label: "Drafts",
      value: drafts.length,
      icon: <PenLine size={16} />,
      note: "Still being refined in Canvas Studio.",
    },
    {
      label: "Completed",
      value: completed.length,
      icon: <CheckCircle size={16} />,
      note: "Ready to export, share, or reuse.",
    },
  ];

  return (
    <div className="animate-page-in mx-auto flex w-full max-w-7xl flex-col gap-6">
      <section className="space-y-1">
        <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-zinc-400">
          Workspace overview
        </span>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="flex items-center gap-3 text-[32px] font-semibold leading-[1.02] tracking-[-0.04em] text-zinc-50 sm:text-[40px]">
              <LayoutDashboard size={24} />
              Dashboard
            </h1>
            <p className="mt-3 max-w-3xl text-[16px] leading-7 text-zinc-300">
              A focused view of your AI content workflow: what is in progress,
              what is done, and what to create next.
            </p>
          </div>
          <span className="font-mono text-[12px] uppercase tracking-[0.18em] text-zinc-500">
            Latest · {latestPostTitle}
          </span>
        </div>
      </section>

      {isLoading && (
        <div className="flex items-center gap-2 rounded-2xl border border-zinc-800/50 bg-zinc-900/30 px-5 py-5 text-sm text-zinc-400 backdrop-blur-xl">
          <Loader2 size={14} className="animate-spin" />
          Loading dashboard...
        </div>
      )}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {topStats.map((card, i) => (
          <div
            key={card.label}
            className="animate-page-in opacity-0 [animation-fill-mode:forwards]"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <StatCard {...card} />
          </div>
        ))}
      </section>

      <section className="grid gap-3 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-2xl border border-zinc-800/50 bg-zinc-900/30 backdrop-blur-xl">
          <div className="border-b border-zinc-800/40 px-5 py-4 sm:px-6">
            <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-zinc-400">
              Recent output
            </span>
            <h2 className="mt-3 text-[24px] font-semibold tracking-[-0.03em] text-zinc-50">
              Recent content
            </h2>
          </div>
          <div className="px-5 py-5 sm:px-6">
            {posts && posts.length === 0 ? (
              <p className="text-sm text-zinc-400">
                No content yet. Start your first piece in Canvas Studio.
              </p>
            ) : (
              <div>
                {posts?.slice(0, 8).map((post) => (
                  <div
                    key={post.id}
                    className="flex flex-col gap-3 border-b border-zinc-800/30 py-3 last:border-b-0 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <FileText size={14} className="shrink-0 text-zinc-500" />
                      <p className="truncate text-[16px] font-medium text-zinc-50">
                        {post.title}
                      </p>
                    </div>
                    <StatusBadge status={post.status} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <QuickLink
            to="/compose"
            title="Open Canvas Studio"
            description="Create new AI-assisted content from scratch."
            icon={<Sparkles size={16} />}
          />
          <QuickLink
            to="/projects"
            title="Browse projects"
            description="Organize content and design references by workspace."
            icon={<FolderKanban size={16} />}
          />
          <QuickLink
            to="/settings/ai-providers"
            title="Review AI providers"
            description="Check keys, preferred models, and Ollama setup."
            icon={<Bot size={16} />}
          />
        </div>
      </section>
    </div>
  );
}
