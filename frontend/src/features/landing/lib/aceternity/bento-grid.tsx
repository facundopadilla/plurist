"use client";

import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function BentoGrid({
  className,
  children,
}: {
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div
      className={cn(
        "mx-auto grid max-w-7xl grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function BentoGridItem({
  className,
  title,
  description,
  header,
  icon,
}: {
  className?: string;
  title?: string | ReactNode;
  description?: string | ReactNode;
  header?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div
      className={cn(
        "group/bento row-span-1 flex flex-col justify-between space-y-4 rounded-[18px] border border-border bg-card p-6 shadow-sm transition-shadow duration-200 hover:shadow-md",
        className,
      )}
    >
      {header}
      <div className="transition duration-200">
        {icon}
        <div className="mb-2 mt-2 text-lg font-semibold text-foreground">
          {title}
        </div>
        <div className="text-sm leading-relaxed text-muted-foreground">
          {description}
        </div>
      </div>
    </div>
  );
}
