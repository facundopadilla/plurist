import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { fetchCalendarEntries } from "./api";
import type { ScheduleEntry } from "./types";

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

function DayCell({
  day,
  entries,
  isToday,
}: {
  day: number;
  entries: ScheduleEntry[];
  isToday: boolean;
}) {
  return (
    <div
      className={`min-h-[80px] border border-border p-1.5 ${
        isToday ? "bg-accent/50" : "bg-card"
      }`}
    >
      <span
        className={`inline-flex h-6 w-6 items-center justify-center rounded-[10px] text-xs ${
          isToday
            ? "bg-primary text-primary-foreground font-bold"
            : "text-muted-foreground"
        }`}
      >
        {day}
      </span>
      <div className="mt-1 space-y-0.5">
        {entries.map((entry) => {
          const entryToneClass =
            entry.status === "pending"
              ? "bg-[hsl(var(--status-warning-bg))] text-[hsl(var(--status-warning-text))]"
              : entry.status === "sent"
                ? "bg-[hsl(var(--status-success-bg))] text-[hsl(var(--status-success-text))]"
                : "bg-[hsl(var(--status-neutral-bg))] text-[hsl(var(--status-neutral-text))]";
          return (
            <div
              key={entry.id}
              className={`truncate rounded px-1 py-0.5 text-[10px] font-medium ${entryToneClass}`}
              title={`Contenido #${entry.draft_post_id} - ${entry.network} (${entry.status})`}
            >
              {new Date(entry.scheduled_for).toLocaleTimeString(undefined, {
                hour: "2-digit",
                minute: "2-digit",
              })}{" "}
              {entry.network}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function CalendarPage() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const start = useMemo(
    () => new Date(year, month, 1).toISOString(),
    [year, month],
  );
  const end = useMemo(
    () => new Date(year, month + 1, 0, 23, 59, 59).toISOString(),
    [year, month],
  );

  const { data: entries, isLoading } = useQuery({
    queryKey: ["calendar-entries", start, end],
    queryFn: () => fetchCalendarEntries(start, end),
  });

  const entriesByDay = useMemo(() => {
    const map = new Map<number, ScheduleEntry[]>();
    for (const entry of entries ?? []) {
      const d = new Date(entry.scheduled_for).getDate();
      const list = map.get(d) ?? [];
      list.push(entry);
      map.set(d, list);
    }
    return map;
  }, [entries]);

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfWeek(year, month);
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const monthName = new Date(year, month).toLocaleString(undefined, {
    month: "long",
    year: "numeric",
  });

  function prevMonth() {
    if (month === 0) {
      setYear(year - 1);
      setMonth(11);
    } else {
      setMonth(month - 1);
    }
  }

  function nextMonth() {
    if (month === 11) {
      setYear(year + 1);
      setMonth(0);
    } else {
      setMonth(month + 1);
    }
  }

  return (
    <div className="space-y-4 animate-page-in">
      <div className="flex items-center justify-between">
        <h1 className="text-[24px] font-semibold tracking-[-0.03em]">
          Calendar
        </h1>
        <div className="flex items-center gap-2">
          {isLoading && (
            <Loader2 size={14} className="animate-spin text-muted-foreground" />
          )}
          <button
            onClick={prevMonth}
            className="rounded-[12px] border border-border p-1.5 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="min-w-[160px] text-center text-sm font-medium">
            {monthName}
          </span>
          <button
            onClick={nextMonth}
            className="rounded-[12px] border border-border p-1.5 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7">
        {dayNames.map((d) => (
          <div
            key={d}
            className="border border-border bg-muted px-2 py-1.5 text-center text-xs font-medium text-muted-foreground"
          >
            {d}
          </div>
        ))}

        {Array.from({ length: firstDay }).map((_, i) => (
          <div
            key={`empty-${i}`}
            className="min-h-[80px] border border-border bg-muted/30"
          />
        ))}

        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const isToday =
            day === today.getDate() &&
            month === today.getMonth() &&
            year === today.getFullYear();
          return (
            <DayCell
              key={day}
              day={day}
              entries={entriesByDay.get(day) ?? []}
              isToday={isToday}
            />
          );
        })}
      </div>
    </div>
  );
}
