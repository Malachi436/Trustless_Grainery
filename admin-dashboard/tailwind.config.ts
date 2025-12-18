import type { Config } from "tailwindcss";

export default {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        primary: {
          DEFAULT: '#4a7c59',
          light: '#e8f5e9',
          dark: '#3a6447',
        },
        gray: {
          50: '#f8f9fa',
          100: '#f1f3f4',
          200: '#e0e0e0',
          300: '#bdbdbd',
          400: '#9e9e9e',
          500: '#757575',
          600: '#616161',
          700: '#424242',
          800: '#1a1a1a',
          900: '#0d0d0d',
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
