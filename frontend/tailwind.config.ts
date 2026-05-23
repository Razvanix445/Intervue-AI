import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  "#fdf5ef",
          100: "#fae8d8",
          200: "#f5cba8",
          300: "#eda475",
          400: "#e07a48",
          500: "#d97757",
          600: "#c45e37",
          700: "#a34929",
          800: "#843a20",
          900: "#6b2f1a",
        },
        warm: {
          50:  "#FAF9F7",
          100: "#F5F3EE",
          200: "#EEEADF",
          300: "#E0DAD0",
          400: "#C9C3B8",
          500: "#ADA89F",
          600: "#8A8580",
          700: "#69655F",
          800: "#4A4741",
          900: "#302E29",
          950: "#1A1A17",
        },
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "fade-in": "fadeIn 0.3s ease-out",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
