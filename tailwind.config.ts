import type { Config } from "tailwindcss";
import typography from "@tailwindcss/typography";

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    // Tighter container for increased density
    container: {
      center: true,
      padding: "2rem",
      screens: {
        sm: "640px",
        md: "768px",
        lg: "1024px",
        xl: "1100px", // Tighter than default 1280px
        "2xl": "1200px", // Much tighter than default 1536px
      },
    },
    extend: {
      colors: {
        // Neo-Brutalist System
        main: {
          DEFAULT: "#FFD02F", // Brand Yellow
          hover: "#E5B800",
        },
        paper: "#fffdf5", // Off-white background
        dark: "#0a0a0a", // High contrast dark

        // Shadcn/Base Compat (Mapped to System or Fallbacks)
        background: "var(--background)",
        foreground: "var(--foreground)",
        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",
        card: {
          DEFAULT: "var(--card)",
          foreground: "var(--card-foreground)",
        },
        popover: {
          DEFAULT: "var(--popover)",
          foreground: "var(--popover-foreground)",
        },
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-foreground)",
        },
        secondary: {
          DEFAULT: "var(--secondary)",
          foreground: "var(--secondary-foreground)",
        },
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted-foreground)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          foreground: "var(--accent-foreground)",
        },
        destructive: {
          DEFAULT: "var(--destructive)",
          foreground: "var(--destructive-foreground)",
        },
      },
      fontFamily: {
        display: ["var(--font-space-grotesk)"],
        sans: ["var(--font-inter)"],
        mono: ["var(--font-jetbrains)"],
      },
      // Neo-Brutalist Border System
      borderWidth: {
        DEFAULT: "2px", // Force 2px default
        "3": "3px",
      },
      // Neo-Brutalist Shadow System
      boxShadow: {
        neo: "4px 4px 0px 0px rgba(0,0,0,1)",
        "neo-lg": "8px 8px 0px 0px rgba(0,0,0,1)",
        "neo-xl": "12px 12px 0px 0px rgba(0,0,0,1)",
      },
      keyframes: {
        "progress-stripes": {
          "0%": { backgroundPosition: "0 0" },
          "100%": { backgroundPosition: "40px 40px" },
        },
      },
      animation: {
        "progress-stripes": "progress-stripes 2s linear infinite",
      },
      borderRadius: {
        DEFAULT: "0px",
        none: "0px",
        sm: "0.125rem",
      },
    },
  },
  plugins: [typography],
};

export default config;
