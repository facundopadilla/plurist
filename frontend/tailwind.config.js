/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        "brutal-yellow": "#FFD23F",
        "brutal-coral": "#FF6B6B",
        "brutal-blue": "#74B9FF",
        "brutal-green": "#88D498",
        "brutal-lavender": "#B8A9FA",
        "brutal-orange": "#FFA552",
        "brutal-pastel-blue": "#d5eaff",
        "brutal-pastel-purple": "#c3bafa",
        "brutal-pastel-green": "#c8daaa",
        "brutal-pastel-yellow": "#fddd9a",
        "brutal-pastel-pink": "#f6bdd9",
        "brutal-bg": "#FFFDF5",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        sans: ['"Geist"', "system-ui", "-apple-system", "sans-serif"],
        mono: ['"Geist Mono"', "ui-monospace", '"SF Mono"', "monospace"],
        display: [
          '"Space Grotesk"',
          "system-ui",
          "-apple-system",
          "sans-serif",
        ],
      },
      boxShadow: {
        "brutal-sm": "3px 3px 0 0 #000",
        brutal: "5px 5px 0 0 #000",
        "brutal-lg": "8px 8px 0 0 #000",
        "brutal-xl": "12px 12px 0 0 #000",
      },
      keyframes: {
        ambilight: {
          "0%, 100%": { opacity: "0.35", transform: "scale(1.05)" },
          "50%": { opacity: "0.55", transform: "scale(1.08)" },
        },
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        shimmer: {
          from: { backgroundPosition: "0 0" },
          to: { backgroundPosition: "-200% 0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        shimmer: "shimmer 2s linear infinite",
        ambilight: "ambilight 4s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
