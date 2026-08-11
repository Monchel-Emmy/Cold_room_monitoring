/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ice: {
          50:  '#eff9ff',
          100: '#d8f1ff',
          200: '#b9e7ff',
          300: '#88d8ff',
          400: '#50c3fc',
          500: '#27a9f8',
          600: '#0e8eed',
          700: '#0c72cb',
          800: '#105ca4',
          900: '#134d87',
        },
        frost: {
          50:  '#f0fdfa',
          100: '#ccfbf1',
          200: '#99f6e4',
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#14b8a6',
          600: '#0d9488',
          700: '#0f766e',
        }
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        glow: {
          '0%':   { boxShadow: '0 0 5px rgba(39,169,248,0.3)' },
          '100%': { boxShadow: '0 0 20px rgba(39,169,248,0.7)' },
        }
      }
    },
  },
  plugins: [],
}
