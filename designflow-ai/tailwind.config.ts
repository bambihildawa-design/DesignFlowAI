import type { Config } from "tailwindcss";

/**
 * DesignFlow AI — design token system.
 *
 * Palette rationale (see /docs/design-tokens.md for the full writeup):
 * - "background/surface" are warm, low-saturation neutrals — not stark white,
 *   not the generic cream/terracotta combo. This is a daily-use tool; the
 *   neutrals need to disappear so content and status colors carry meaning.
 * - "accent" (teal) is the single brand color, used sparingly: primary actions,
 *   the wizard's connecting "thread" rail, and active/focus states.
 * - warning/success/danger are semantic and map directly to project/QA/approval
 *   states — these are functional colors, not decoration.
 */
const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        surface: {
          DEFAULT: "hsl(var(--surface))",
          raised: "hsl(var(--surface-raised))",
        },
        foreground: "hsl(var(--foreground))",
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        border: "hsl(var(--border))",
        ring: "hsl(var(--ring))",
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        danger: {
          DEFAULT: "hsl(var(--danger))",
          foreground: "hsl(var(--danger-foreground))",
        },
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "ui-monospace", "monospace"],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 4px)",
        sm: "calc(var(--radius) - 8px)",
        xl: "calc(var(--radius) + 6px)",
      },
      backdropBlur: {
        glass: "16px",
      },
      keyframes: {
        "thread-fill": {
          from: { transform: "scaleY(0)" },
          to: { transform: "scaleY(1)" },
        },
        "fade-in": {
          from: { opacity: "0", transform: "translateY(4px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "thread-fill": "thread-fill 0.4s ease-out forwards",
        "fade-in": "fade-in 0.3s ease-out forwards",
      },
    },
  },
  plugins: [],
};

export default config;
