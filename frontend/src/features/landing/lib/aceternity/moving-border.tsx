"use client";

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { useRef } from "react";

export function MovingBorder({
  children,
  duration = 4000,
  className,
  containerClassName,
  borderClassName,
  as: Component = "div",
}: {
  children: ReactNode;
  duration?: number;
  className?: string;
  containerClassName?: string;
  borderClassName?: string;
  as?: React.ElementType;
}) {
  const pathRef = useRef<SVGRectElement>(null);

  return (
    <Component
      className={cn(
        "relative overflow-hidden rounded-[18px] bg-transparent p-[1px]",
        containerClassName,
      )}
    >
      <div className="absolute inset-0 overflow-hidden rounded-[18px]">
        <svg
          className="absolute h-full w-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect
            ref={pathRef}
            x="0"
            y="0"
            width="100"
            height="100"
            rx="18"
            fill="none"
            strokeWidth="0"
          />
        </svg>
        <motion.div
          className={cn("absolute h-20 w-20 opacity-[0.8]", borderClassName)}
          style={{
            background:
              "radial-gradient(hsl(var(--primary)) 40%, hsl(var(--secondary)) 60%, transparent 80%)",
          }}
          animate={{
            x: ["0%", "400%", "400%", "0%", "0%"],
            y: ["0%", "0%", "400%", "400%", "0%"],
          }}
          transition={{
            duration: duration / 1000,
            repeat: Infinity,
            ease: "linear",
          }}
        />
      </div>
      <div
        className={cn(
          "relative z-10 rounded-[17px] border border-border bg-card",
          className,
        )}
      >
        {children}
      </div>
    </Component>
  );
}
