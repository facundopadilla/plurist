import { cn } from "../../lib/utils";

type StatusTone = "success" | "warning" | "danger" | "info" | "neutral";

interface StatusBadgeProps {
  label: string;
  tone?: StatusTone;
  icon?: React.ReactNode;
  /** "pill" = rounded-full, "tag" = rounded-[12px] (default), "token" = mono uppercase */
  variant?: "tag" | "pill" | "token";
  className?: string;
}

const toneClasses: Record<StatusTone, string> = {
  success:
    "border-[hsl(var(--status-success-border)/0.35)] bg-[hsl(var(--status-success-bg))] text-[hsl(var(--status-success-text))]",
  warning:
    "border-[hsl(var(--status-warning-border)/0.35)] bg-[hsl(var(--status-warning-bg))] text-[hsl(var(--status-warning-text))]",
  danger:
    "border-[hsl(var(--status-danger-border)/0.30)] bg-[hsl(var(--status-danger-bg))] text-[hsl(var(--status-danger-text))]",
  info: "border-[hsl(var(--status-info-border)/0.25)] bg-[hsl(var(--status-info-bg))] text-[hsl(var(--status-info-text))]",
  neutral:
    "border-[hsl(var(--status-neutral-border))] bg-[hsl(var(--status-neutral-bg))] text-[hsl(var(--status-neutral-text))]",
};

const variantClasses = {
  tag: "rounded-[12px] px-2.5 py-1",
  pill: "rounded-full px-2 py-0.5",
  token: "px-2 py-1",
};

export function StatusBadge({
  label,
  tone = "neutral",
  icon,
  variant = "tag",
  className,
}: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 border text-xs font-medium",
        variantClasses[variant],
        toneClasses[tone],
        variant === "token" && "font-elegant-mono uppercase tracking-[0.18em]",
        className,
      )}
    >
      {icon}
      {label}
    </span>
  );
}
