"use client";

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import type { ReactNode } from "react";

export function LampContainer({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative z-0 flex min-h-[500px] w-full flex-col items-center justify-center overflow-hidden rounded-[22px] bg-background",
        className,
      )}
    >
      <div className="relative isolate z-0 flex w-full flex-1 items-center justify-center">
        {/* Lamp glow */}
        <motion.div
          initial={{ opacity: 0.5, width: "8rem" }}
          whileInView={{ opacity: 1, width: "20rem" }}
          transition={{ delay: 0.3, duration: 0.8, ease: "easeInOut" }}
          style={{
            backgroundImage:
              "conic-gradient(var(--conic-position), var(--tw-gradient-stops))",
          }}
          className="absolute inset-auto right-1/2 top-1/2 h-56 w-[20rem] overflow-visible bg-gradient-to-r from-primary via-transparent to-transparent [--conic-position:from_70deg_at_center_top]"
        >
          <div className="absolute bottom-0 left-0 z-20 h-40 w-full bg-background [mask-image:linear-gradient(to_top,white,transparent)]" />
          <div className="absolute bottom-0 left-0 z-20 h-full w-10 bg-background" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0.5, width: "8rem" }}
          whileInView={{ opacity: 1, width: "20rem" }}
          transition={{ delay: 0.3, duration: 0.8, ease: "easeInOut" }}
          style={{
            backgroundImage:
              "conic-gradient(var(--conic-position), var(--tw-gradient-stops))",
          }}
          className="absolute inset-auto left-1/2 top-1/2 h-56 w-[20rem] bg-gradient-to-l from-secondary via-transparent to-transparent [--conic-position:from_290deg_at_center_top]"
        >
          <div className="absolute bottom-0 right-0 z-20 h-full w-10 bg-background" />
          <div className="absolute bottom-0 right-0 z-20 h-40 w-full bg-background [mask-image:linear-gradient(to_top,white,transparent)]" />
        </motion.div>

        {/* Top line */}
        <motion.div
          initial={{ width: "8rem" }}
          whileInView={{ width: "16rem" }}
          transition={{ delay: 0.3, duration: 0.8, ease: "easeInOut" }}
          className="absolute inset-auto z-30 h-0.5 w-[16rem] -translate-y-[7rem] bg-primary"
        />

        {/* Glow blur */}
        <div className="absolute inset-auto z-40 h-44 w-full -translate-y-[12.5rem] bg-background" />
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 0.5 }}
          transition={{ delay: 0.5, duration: 0.8 }}
          className="absolute inset-x-0 top-1/2 z-20 h-48 -translate-y-1/2 bg-gradient-to-b from-primary/10 to-transparent blur-3xl"
        />
      </div>

      {/* Content */}
      <div className="relative z-50 -mt-32 flex flex-col items-center px-5">
        {children}
      </div>
    </div>
  );
}
