import { useQuery } from "@tanstack/react-query";
import {
  LayoutDashboard,
  Loader2,
  FileText,
  Clock,
  CheckCircle,
  Send,
  AlertCircle,
} from "lucide-react";
import { fetchContent } from "../content/api";
import { fetchEntries } from "../scheduler/api";
import { fetchSummary } from "../analytics/api";
import { StatusBadge } from "../../components/ui/status-badge";

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
    <div className="paper-stat">
      <div className="flex items-center justify-between gap-3">
        <div className="paper-stat-label">{label}</div>
        <div className="text-muted-foreground">{icon}</div>
      </div>
      <p className="mt-4 text-[32px] font-semibold leading-none tracking-[-0.05em] text-foreground">
        {value}
      </p>
      <p className="mt-2 text-sm text-muted-foreground">{note}</p>
    </div>
  );
}

export function DashboardPage() {
  const { data: posts, isLoading: postsLoading } = useQuery({
    queryKey: ["content"],
    queryFn: fetchContent,
  });

  const { data: entries, isLoading: entriesLoading } = useQuery({
    queryKey: ["schedule-entries"],
    queryFn: fetchEntries,
  });

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ["analytics-summary"],
    queryFn: fetchSummary,
  });

  const isLoading = postsLoading || entriesLoading || summaryLoading;

  const pendingApproval =
    posts?.filter((p) => p.status === "pending_approval") ?? [];
  const approved = posts?.filter((p) => p.status === "approved") ?? [];
  const published = posts?.filter((p) => p.status === "published") ?? [];
  const failed = posts?.filter((p) => p.status === "failed") ?? [];
  const upcomingScheduled =
    entries?.filter((e) => e.status === "pending") ?? [];
  const latestPostTitle = posts?.[0]?.title ?? "No hay contenido reciente";

  return (
    <div className="animate-page-in paper-page">
      <section className="paper-page-header">
        <div className="paper-kicker">Dashboard snapshot</div>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="paper-title flex items-center gap-3">
              <LayoutDashboard size={24} />
              Dashboard
            </h1>
            <p className="paper-lead">
              Review approval pressure, scheduling load, and publishing outcomes
              from a cleaner workspace overview.
            </p>
          </div>
          <div className="font-elegant-mono text-[12px] uppercase tracking-[0.18em] text-muted-foreground">
            Último contenido · {latestPostTitle}
          </div>
        </div>
      </section>

      {isLoading && (
        <div className="paper-panel paper-panel-body flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 size={14} className="animate-spin" />
          Loading dashboard...
        </div>
      )}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Pending approval"
          value={pendingApproval.length}
          icon={<Clock size={16} />}
          note="Drafts waiting for owner review."
        />
        <StatCard
          label="Approved"
          value={approved.length}
          icon={<CheckCircle size={16} />}
          note="Ready for publisher action."
        />
        <StatCard
          label="Published"
          value={published.length}
          icon={<Send size={16} />}
          note="Completed output already delivered."
        />
        <StatCard
          label="Scheduled"
          value={upcomingScheduled.length}
          icon={<Clock size={16} />}
          note="Items still queued on the calendar."
        />
      </section>

      {summary && (
        <section className="paper-panel">
          <div className="paper-panel-header">
            <div className="paper-kicker">Operational metrics</div>
            <h2 className="paper-section-title mt-3">Publishing throughput</h2>
          </div>
          <div className="grid gap-3 px-5 py-5 sm:grid-cols-3 sm:px-6">
            <StatCard
              label="Publish requested"
              value={summary.publish_requested}
              icon={<Send size={16} />}
              note="Total outbound publish attempts."
            />
            <StatCard
              label="Succeeded"
              value={summary.publish_succeeded}
              icon={<CheckCircle size={16} />}
              note="Successfully delivered without operator action."
            />
            <StatCard
              label="Failed"
              value={summary.publish_failed}
              icon={<AlertCircle size={16} />}
              note="Failures requiring intervention."
            />
          </div>
        </section>
      )}

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="paper-panel">
          <div className="paper-panel-header">
            <div className="paper-kicker">Recent output</div>
            <h2 className="paper-section-title mt-3">Contenido reciente</h2>
          </div>
          <div className="paper-panel-body">
            {posts && posts.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No hay contenido. Creá tu primer contenido desde Compose.
              </p>
            ) : (
              <div>
                {posts?.slice(0, 5).map((post) => (
                  <div key={post.id} className="paper-list-row">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <FileText size={14} className="text-muted-foreground" />
                        <p className="truncate text-[16px] font-medium text-foreground">
                          {post.title}
                        </p>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {post.target_networks.map((network) => (
                          <StatusBadge
                            key={network}
                            label={network}
                            tone="neutral"
                            variant="token"
                          />
                        ))}
                      </div>
                    </div>
                    <div className="flex items-start justify-end">
                      <StatusBadge
                        label={post.status.replace("_", " ")}
                        tone={
                          post.status === "published"
                            ? "success"
                            : post.status === "pending_approval"
                              ? "warning"
                              : post.status === "failed"
                                ? "danger"
                                : "neutral"
                        }
                        variant="token"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="paper-panel">
          <div className="paper-panel-header">
            <div className="paper-kicker">Calendar pressure</div>
            <h2 className="paper-section-title mt-3">
              Upcoming scheduled items
            </h2>
          </div>
          <div className="paper-panel-body">
            {upcomingScheduled.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No hay contenido programado.
              </p>
            ) : (
              <div>
                {upcomingScheduled.slice(0, 5).map((entry) => (
                  <div key={entry.id} className="paper-list-row">
                    <div className="min-w-0">
                      <p className="text-[16px] font-medium text-foreground">
                        Contenido #{entry.draft_post_id}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {new Date(entry.scheduled_for).toLocaleString()} ·{" "}
                        {entry.network}
                      </p>
                    </div>
                    <div className="flex items-start justify-end">
                      <StatusBadge
                        label={entry.status}
                        tone="neutral"
                        variant="token"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {failed.length > 0 && (
        <section className="paper-panel">
          <div className="paper-panel-header">
            <div className="paper-kicker">Exceptions</div>
            <h2 className="paper-section-title mt-3">Contenido fallido</h2>
          </div>
          <div className="paper-panel-body">
            {failed.map((post) => (
              <div key={post.id} className="paper-list-row">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <AlertCircle size={14} className="text-red-600" />
                    <p className="truncate text-[16px] font-medium text-foreground">
                      {post.title}
                    </p>
                  </div>
                  {post.failure_message ? (
                    <p className="mt-2 text-sm text-red-700">
                      {post.failure_message}
                    </p>
                  ) : null}
                </div>
                <div className="flex items-start justify-end">
                  <StatusBadge label="failed" tone="danger" variant="token" />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
