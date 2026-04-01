import { cn } from "../../lib/utils";

interface StatusMessageProps {
  icon: React.ComponentType<{ size?: string | number; className?: string }>;
  message: string;
  tone: "success" | "error" | "warning" | "info";
  className?: string;
}

const toneMap = {
  success:
    "border-[hsl(var(--status-success-border)/0.35)] bg-[hsl(var(--status-success-bg))] text-[hsl(var(--status-success-text))]",
  error:
    "border-[hsl(var(--status-danger-border)/0.28)] bg-[hsl(var(--status-danger-bg))] text-[hsl(var(--status-danger-text))]",
  warning:
    "border-[hsl(var(--status-warning-border)/0.35)] bg-[hsl(var(--status-warning-bg))] text-[hsl(var(--status-warning-text))]",
  info: "border-[hsl(var(--status-info-border)/0.25)] bg-[hsl(var(--status-info-bg))] text-[hsl(var(--status-info-text))]",
};

export function StatusMessage({
  icon: Icon,
  message,
  tone,
  className,
}: StatusMessageProps) {
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-[14px] border px-3 py-3 text-[14px]",
        toneMap[tone],
        className,
      )}
    >
      <Icon size={16} className="mt-0.5 shrink-0" />
      <span>{message}</span>
    </div>
  );
}
