import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    container: { center: true, padding: "1rem" },
    extend: {
      colors: {
        // IGMS brand placeholders — swap hex values in globals.css when real colors are confirmed.
        brand: {
          bg: "hsl(var(--brand-bg))",
          surface: "hsl(var(--brand-surface))",
          border: "hsl(var(--brand-border))",
          fg: "hsl(var(--brand-fg))",
          muted: "hsl(var(--brand-muted))",
          accent: "hsl(var(--brand-accent))",
          "accent-fg": "hsl(var(--brand-accent-fg))",
          danger: "hsl(var(--brand-danger))",
          warning: "hsl(var(--brand-warning))",
          success: "hsl(var(--brand-success))",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular"],
      },
      borderRadius: {
        lg: "0.625rem",
        md: "0.5rem",
        sm: "0.375rem",
      },
    },
  },
  plugins: [],
};

export default config;
