/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.tsx", "./app/**/*.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // Agricultural green palette
        primary: {
          50: '#f0f9f1',
          100: '#dcf0de',
          200: '#bce2c0',
          300: '#8fcd96',
          400: '#5eb268',
          500: '#3d9448',
          600: '#2d7838',
          700: '#265f2e',
          800: '#224c28',
          900: '#1d3f22',
        },
        // Earth tones
        sand: {
          50: '#faf8f5',
          100: '#f5f0e8',
          200: '#e9dfd0',
          300: '#d9c9b0',
          400: '#c6ae8e',
          500: '#b89974',
          600: '#ab8661',
          700: '#8f6e52',
          800: '#755b47',
          900: '#604c3c',
        },
        // Neutral backgrounds
        neutral: {
          50: '#fafaf9',
          100: '#f5f5f4',
          200: '#e7e5e4',
          300: '#d6d3d1',
          400: '#a8a29e',
          500: '#78716c',
          600: '#57534e',
          700: '#44403c',
          800: '#292524',
          900: '#1c1917',
        },
        // Danger
        danger: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#b91c1c',
          600: '#991b1b',
        },
        // Success
        success: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          500: '#16a34a',
          600: '#15803d',
        },
      },
    },
  },
  plugins: [],
};
