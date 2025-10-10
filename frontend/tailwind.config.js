/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class', // Enable dark mode based on the 'dark' class
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        // Define dark mode specific colors if needed, or rely on Tailwind's default dark variants
        dark: {
          'bg-primary': '#1a202c',
          'bg-secondary': '#2d3748',
          'text-primary': '#e2e8f0',
          'text-secondary': '#a0aec0',
        }
      },
    },
  },
  plugins: [],
}
