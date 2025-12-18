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
        agricultural: {
          green: '#3d9448',
          'green-light': '#dcfce7',
          sand: '#f5f5f4',
          clay: '#e7e5e4',
          beige: '#fafaf9',
          olive: '#84cc16',
          earth: '#78716c',
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
