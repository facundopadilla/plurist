"use client";

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

export function BackgroundBeams({ className }: { className?: string }) {
  const [isMounted, setIsMounted] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const paths = [
    "M-380 -189C-380 -189 -312 216 152 343C616 470 684 875 684 875",
    "M-373 -197C-373 -197 -305 208 159 335C623 462 691 867 691 867",
    "M-366 -205C-366 -205 -298 200 166 327C630 454 698 859 698 859",
    "M-359 -213C-359 -213 -291 192 173 319C637 446 705 851 705 851",
    "M-352 -221C-352 -221 -284 184 180 311C644 438 712 843 712 843",
    "M-345 -229C-345 -229 -277 176 187 303C651 430 719 835 719 835",
    "M-338 -237C-338 -237 -270 168 194 295C658 422 726 827 726 827",
    "M-331 -245C-331 -245 -263 160 201 287C665 414 733 819 733 819",
    "M-324 -253C-324 -253 -256 152 208 279C672 406 740 811 740 811",
    "M-317 -261C-317 -261 -249 144 215 271C679 398 747 803 747 803",
  ];

  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden",
        className,
      )}
    >
      <svg
        ref={svgRef}
        className="absolute h-full w-full"
        viewBox="0 0 696 316"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {paths.map((path, idx) => (
          <motion.path
            key={idx}
            d={path}
            stroke={`url(#grad-${idx})`}
            strokeOpacity="0.15"
            strokeWidth="0.5"
          />
        ))}
        <defs>
          {paths.map((_, idx) => (
            <motion.linearGradient
              key={idx}
              id={`grad-${idx}`}
              initial={{ x1: "0%", x2: "0%", y1: "0%", y2: "0%" }}
              animate={
                isMounted
                  ? {
                      x1: ["0%", "100%"],
                      x2: ["0%", "95%"],
                      y1: ["0%", "100%"],
                      y2: ["0%", "120%"],
                    }
                  : undefined
              }
              transition={{
                duration: Math.random() * 6 + 4,
                ease: "easeInOut",
                repeat: Infinity,
                delay: Math.random() * 3,
              }}
            >
              <stop stopColor="hsl(var(--primary))" stopOpacity="0" />
              <stop stopColor="hsl(var(--primary))" />
              <stop offset="32.5%" stopColor="hsl(var(--secondary))" />
              <stop
                offset="100%"
                stopColor="hsl(var(--secondary))"
                stopOpacity="0"
              />
            </motion.linearGradient>
          ))}
        </defs>
      </svg>
    </div>
  );
}
