/* eslint-disable react-refresh/only-export-components */
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground shadow hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground shadow hover:bg-destructive/80",
        outline: "text-foreground",
        success:
          "border-[hsl(var(--status-success-border)/0.35)] bg-[hsl(var(--status-success-bg))] text-[hsl(var(--status-success-text))]",
        warning:
          "border-[hsl(var(--status-warning-border)/0.35)] bg-[hsl(var(--status-warning-bg))] text-[hsl(var(--status-warning-text))]",
        danger:
          "border-[hsl(var(--status-danger-border)/0.30)] bg-[hsl(var(--status-danger-bg))] text-[hsl(var(--status-danger-text))]",
        info: "border-[hsl(var(--status-info-border)/0.25)] bg-[hsl(var(--status-info-bg))] text-[hsl(var(--status-info-text))]",
        neutral:
          "border-[hsl(var(--status-neutral-border))] bg-[hsl(var(--status-neutral-bg))] text-[hsl(var(--status-neutral-text))]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends
    React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: Readonly<BadgeProps>) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
