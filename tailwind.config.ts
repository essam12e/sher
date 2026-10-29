import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // ألوان شعار نطاق: الأزرق #0055FD والسماوي #01BDFE
        brand: {
          50: "#EEF4FF",
          100: "#DCE8FF",
          200: "#B9D0FF",
          300: "#86AEFF",
          400: "#4A85FE",
          500: "#1E68FD",
          600: "#0055FD",
          700: "#0044D4",
          800: "#0039AB",
          900: "#022F85",
        },
        accent: {
          50: "#E8F9FF",
          100: "#C6F0FF",
          400: "#33CAFE",
          500: "#01BDFE",
          600: "#009AD4",
        },
      },
      fontFamily: {
        sans: ["Tajawal", "Arial", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
