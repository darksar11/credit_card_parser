/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          50: '#f0f4f8',
          100: '#d9e2ec',
          200: '#bcccdc',
          300: '#9fb3c8',
          400: '#829ab1',
          500: '#627d98',
          600: '#486581',
          700: '#334e68',
          800: '#243b53',
          900: '#0f1c2e',
          950: '#0a1628',
        },
        accent: {
          cyan: '#00d4ff',
          purple: '#a855f7',
          green: '#10b981',
          yellow: '#fbbf24',
        }
      },
      backgroundColor: {
        'dark-primary': '#0a1628',
        'dark-secondary': '#0f1c2e',
        'dark-card': '#1a2332',
      },
      borderColor: {
        'dark-border': '#243b53',
      }
    },
  },
  plugins: [],
}
