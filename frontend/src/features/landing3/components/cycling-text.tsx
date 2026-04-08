import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const GRADIENT =
  "linear-gradient(90deg, #c084fc, #22d3ee, #f472b6, #a78bfa, #34d399, #fb923c, #c084fc)";

interface CyclingTextProps {
  words: string[];
  interval?: number;
  className?: string;
}

export function CyclingText({
  words,
  interval = 2400,
  className = "",
}: Readonly<CyclingTextProps>) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setIndex((prev) => (prev + 1) % words.length);
    }, interval);
    return () => clearInterval(id);
  }, [words.length, interval]);

  return (
    <span className={`relative inline-block ${className}`}>
      <AnimatePresence mode="wait">
        <motion.span
          key={words[index]}
          initial={{ y: 20, opacity: 0, filter: "blur(4px)" }}
          animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
          exit={{ y: -20, opacity: 0, filter: "blur(4px)" }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="inline-block bg-clip-text text-transparent"
          style={{
            backgroundImage: GRADIENT,
            backgroundSize: "200% 100%",
            animation: "color-wave 3s linear infinite",
          }}
        >
          {words[index]}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

/** Static color wave — no cycling, just the animated gradient */
export function ColorWave({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <span
      className="bg-clip-text text-transparent"
      style={{
        backgroundImage: GRADIENT,
        backgroundSize: "200% 100%",
        animation: "color-wave 3s linear infinite",
      }}
    >
      {children}
    </span>
  );
}

/** Color wave that appears on hover via group-hover */
export function ColorWaveButton({
  children,
  className = "",
}: Readonly<{
  children: React.ReactNode;
  className?: string;
}>) {
  return (
    <span className={`relative inline-flex items-center ${className}`}>
      {/* Normal text */}
      <span className="transition-opacity duration-300 group-hover:opacity-0">
        {children}
      </span>
      {/* Color wave text on hover */}
      <span
        className="absolute inset-0 flex items-center justify-center bg-clip-text text-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          backgroundImage: GRADIENT,
          backgroundSize: "200% 100%",
          animation: "color-wave 3s linear infinite",
        }}
      >
        {children}
      </span>
    </span>
  );
}
