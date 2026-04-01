import { useQuery } from "@tanstack/react-query";
import {
  BarChart3,
  Loader2,
  CheckCircle,
  XCircle,
  Send,
  AlertCircle,
  Clock,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { fetchSummary, fetchTimeline } from "./api";
import type { AuditEvent } from "./types";

function SummaryCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className="paper-stat">
      <div className="paper-stat-label flex items-center gap-2">
        <span className={color}>{icon}</span>
        {label}
      </div>
      <p className="mt-4 text-[32px] font-semibold leading-none tracking-[-0.05em] text-foreground">
        {value}
      </p>
    </div>
  );
}

function eventIcon(eventType: string) {
  if (eventType.includes("approve"))
    return <CheckCircle size={14} className="text-green-500" />;
  if (eventType.includes("reject"))
    return <XCircle size={14} className="text-red-500" />;
  if (eventType.includes("publish") && eventType.includes("fail"))
    return <AlertCircle size={14} className="text-red-500" />;
  if (eventType.includes("publish"))
    return <Send size={14} className="text-blue-500" />;
  return <Clock size={14} className="text-muted-foreground" />;
}

function formatEventType(eventType: string) {
  return eventType.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function TimelineItem({ event }: { event: AuditEvent }) {
  return (
    <div className="paper-list-row">
      <div className="mt-0.5">{eventIcon(event.event_type)}</div>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-foreground">
          {formatEventType(event.event_type)}
          <span className="ml-2 text-xs text-muted-foreground">
            {event.target_type} #{event.target_id}
          </span>
        </p>
        <p className="text-xs text-muted-foreground">
          {new Date(event.created_at).toLocaleString()}
          {event.actor_id && ` \u00b7 User #${event.actor_id}`}
        </p>
      </div>
    </div>
  );
}

export function AnalyticsPage() {
  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ["analytics-summary"],
    queryFn: fetchSummary,
  });

  const { data: timeline, isLoading: timelineLoading } = useQuery({
    queryKey: ["analytics-timeline"],
    queryFn: () => fetchTimeline(50),
  });

  const isLoading = summaryLoading || timelineLoading;

  return (
    <div className="paper-page animate-page-in">
      <section className="paper-page-header">
        <div className="paper-kicker">Analytics overview</div>
        <h1 className="paper-title mt-3 flex items-center gap-3">
          <BarChart3 size={24} />
          Operational metrics
        </h1>
        <p className="paper-lead">
          Review the audit trail, publishing outcomes, and approval volume from
          a single, clearer operational view.
        </p>
      </section>

      {isLoading && (
        <div className="paper-panel paper-panel-body flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 size={14} className="animate-spin" />
          Loading analytics...
        </div>
      )}

      {summary && (
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <SummaryCard
            label="Publish Requested"
            value={summary.publish_requested}
            icon={<Send size={14} />}
            color="text-blue-500"
          />
          <SummaryCard
            label="Publish Succeeded"
            value={summary.publish_succeeded}
            icon={<CheckCircle size={14} />}
            color="text-green-500"
          />
          <SummaryCard
            label="Publish Failed"
            value={summary.publish_failed}
            icon={<AlertCircle size={14} />}
            color="text-red-500"
          />
          <SummaryCard
            label="Approval Requested"
            value={summary.approval_requested}
            icon={<Clock size={14} />}
            color="text-amber-500"
          />
          <SummaryCard
            label="Approved"
            value={summary.approval_approved}
            icon={<CheckCircle size={14} />}
            color="text-green-500"
          />
          <SummaryCard
            label="Rejected"
            value={summary.approval_rejected}
            icon={<XCircle size={14} />}
            color="text-red-500"
          />
        </section>
      )}

      {timeline && timeline.length > 0 && (
        <section className="paper-panel">
          <div className="paper-panel-header">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="paper-kicker">Audit trail</div>
                <h2 className="paper-section-title mt-3">Timeline</h2>
              </div>
              <Badge
                variant="neutral"
                className="font-mono uppercase tracking-[0.18em]"
              >
                {timeline.length} events
              </Badge>
            </div>
          </div>
          <div className="paper-panel-body">
            {timeline.map((event) => (
              <TimelineItem key={event.id} event={event} />
            ))}
          </div>
        </section>
      )}

      {timeline && timeline.length === 0 && !isLoading && (
        <section className="paper-panel paper-panel-body">
          <p className="text-sm text-muted-foreground">
            a medida que se cree, revise y publique contenido.
          </p>
        </section>
      )}
    </div>
  );
}
