import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Clock, Loader2, Trash2, Calendar } from "lucide-react";
import { useAuth } from "../auth/use-auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { fetchEntries, cancelEntry } from "./api";
import type { ScheduleEntry } from "./types";

function EntryCard({ entry }: { entry: ScheduleEntry }) {
  const { isOwner, isPublisher } = useAuth();
  const queryClient = useQueryClient();
  const canCancel = (isOwner || isPublisher) && entry.status === "pending";

  const cancelMutation = useMutation({
    mutationFn: () => cancelEntry(entry.id),
    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: ["schedule-entries"] }),
  });

  const statusTone = (
    entry.status === "pending"
      ? "warning"
      : entry.status === "sent"
        ? "success"
        : entry.status === "failed"
          ? "danger"
          : "neutral"
  ) as "warning" | "success" | "danger" | "neutral";

  const scheduledDate = new Date(entry.scheduled_for);

  return (
    <div className="rounded-xl border border-border bg-card text-card-foreground shadow-sm flex items-center gap-4 p-4">
      <div className="flex min-w-[60px] flex-col items-center justify-center rounded-[14px] bg-muted px-3 py-2 text-center">
        <span className="text-xs font-medium text-muted-foreground">
          {scheduledDate.toLocaleDateString(undefined, { month: "short" })}
        </span>
        <span className="text-lg font-bold text-foreground">
          {scheduledDate.getDate()}
        </span>
        <span className="text-xs text-muted-foreground">
          {scheduledDate.toLocaleTimeString(undefined, {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-muted px-2 py-0.5 text-xs text-muted-foreground">
            {entry.network}
          </span>
          <Badge
            variant={statusTone}
            className="rounded-full px-2 py-0.5 gap-1"
          >
            {entry.status}
          </Badge>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Contenido #{entry.draft_post_id} &middot; {entry.timezone}
        </p>
      </div>

      {canCancel && (
        <Button
          onClick={() => cancelMutation.mutate()}
          disabled={cancelMutation.isPending}
          variant="outline"
          size="sm"
          className="gap-1 text-muted-foreground hover:bg-red-50 hover:text-red-600 hover:border-red-200"
        >
          {cancelMutation.isPending ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <Trash2 size={12} />
          )}
          Cancel
        </Button>
      )}
    </div>
  );
}

export function QueuePage() {
  const {
    data: entries,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["schedule-entries"],
    queryFn: fetchEntries,
    refetchInterval: 10000,
  });

  const pending = entries?.filter((e) => e.status === "pending") ?? [];
  const completed = entries?.filter((e) => e.status !== "pending") ?? [];

  return (
    <div className="space-y-6 animate-page-in">
      <div>
        <h1 className="text-[24px] font-semibold tracking-[-0.03em] flex items-center gap-2">
          <Clock size={20} />
          Queue
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Contenido programado esperando publicación.
        </p>
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 size={14} className="animate-spin" />
          Loading queue...
        </div>
      )}

      {isError && (
        <p className="text-sm text-destructive">
          Failed to load queue. Please refresh the page.
        </p>
      )}

      {entries && entries.length === 0 && (
        <div className="text-center py-8">
          <Calendar size={32} className="mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">
            No hay contenido programado. Aprobá un contenido y programalo para
            verlo aquí.
          </p>
        </div>
      )}

      {pending.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground">
            Upcoming
            <span className="ml-2 font-normal text-muted-foreground">
              ({pending.length})
            </span>
          </h2>
          <div className="grid gap-2">
            {pending.map((entry) => (
              <EntryCard key={entry.id} entry={entry} />
            ))}
          </div>
        </div>
      )}

      {completed.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground">
            Completed
            <span className="ml-2 font-normal text-muted-foreground">
              ({completed.length})
            </span>
          </h2>
          <div className="grid gap-2">
            {completed.map((entry) => (
              <EntryCard key={entry.id} entry={entry} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
