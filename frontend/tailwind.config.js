/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        surface: {
          0: "var(--surface-0)",
          1: "var(--surface-1)",
          2: "var(--surface-2)",
          sunken: "var(--surface-sunken)",
        },
        ink: {
          900: "var(--ink-900)",
          700: "var(--ink-700)",
          500: "var(--ink-500)",
          300: "var(--ink-300)",
        },
        line: "var(--line)",
        accent: {
          DEFAULT: "var(--accent)",
          soft: "var(--accent-soft)",
          strong: "var(--accent-strong)",
        },
        brass: {
          DEFAULT: "var(--brass)",
          soft: "var(--brass-soft)",
        },
        status: {
          good: "var(--status-good)",
          "good-soft": "var(--status-good-soft)",
          warn: "var(--status-warn)",
          "warn-soft": "var(--status-warn-soft)",
          critical: "var(--status-critical)",
          "critical-soft": "var(--status-critical-soft)",
        },
      },
      fontFamily: {
        display: ["\"Iowan Old Style\"", "\"Palatino Linotype\"", "Georgia", "serif"],
        sans: [
          "-apple-system", "BlinkMacSystemFont", "\"Segoe UI\"", "Inter", "Roboto",
          "Helvetica", "Arial", "sans-serif",
        ],
      },
      borderRadius: {
        lg: "12px",
        xl: "16px",
        "2xl": "20px",
        "3xl": "28px",
      },
      boxShadow: {
        xs: "0 1px 2px rgba(15, 23, 20, 0.04)",
        card: "0 1px 2px rgba(15, 23, 20, 0.04), 0 8px 24px -12px rgba(15, 23, 20, 0.10)",
        "card-hover": "0 2px 4px rgba(15, 23, 20, 0.06), 0 16px 40px -16px rgba(15, 23, 20, 0.18)",
        floating: "0 8px 16px -4px rgba(15, 23, 20, 0.12), 0 24px 56px -20px rgba(15, 23, 20, 0.28)",
        "focus-ring": "0 0 0 3px var(--accent-soft)",
      },
      transitionTimingFunction: {
        "out-expo": "cubic-bezier(0.16, 1, 0.3, 1)",
        "in-out-smooth": "cubic-bezier(0.4, 0, 0.2, 1)",
      },
      keyframes: {
        "fade-in": { from: { opacity: 0 }, to: { opacity: 1 } },
        "fade-up": { from: { opacity: 0, transform: "translateY(6px)" }, to: { opacity: 1, transform: "translateY(0)" } },
      },
      animation: {
        "fade-in": "fade-in 0.2s var(--ease-out-expo, cubic-bezier(0.16,1,0.3,1))",
        "fade-up": "fade-up 0.28s var(--ease-out-expo, cubic-bezier(0.16,1,0.3,1))",
      },
    },
  },
  plugins: [],
};
