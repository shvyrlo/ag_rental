/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        // Body + UI: Inter, with a clean system fallback.
        sans: [
          '"Inter"', 'ui-sans-serif', 'system-ui', '-apple-system',
          'Segoe UI', 'Roboto', 'sans-serif',
        ],
        // Display headlines: Barlow Condensed — matches the industrial
        // condensed sans used in the AG wordmark subtitle.
        display: [
          '"Barlow Condensed"', '"Inter"', 'ui-sans-serif', 'system-ui',
          '-apple-system', 'sans-serif',
        ],
      },
      colors: {
        // Matches the red gradient on the "A" in the AG logo.
        brand: {
          50:  '#fdf2f3',
          100: '#fce4e6',
          200: '#f8cdd2',
          300: '#f49aa3',
          400: '#e8616f',
          500: '#d02436',
          600: '#b91c2b',
          700: '#991b1f',
          800: '#7f1624',
        },
        // Matches the teal/blue gradient on the "G" in the AG logo.
        accent: {
          50:  '#f0f6f9',
          100: '#d9eaf2',
          200: '#b4d4e2',
          300: '#7fb0c6',
          400: '#4b8da8',
          500: '#1a6b88',
          600: '#0e5670',
          700: '#094862',
          800: '#0a3a4e',
        },
      },
      letterSpacing: {
        tightest: '-0.04em',
      },
      // Custom font-feature-settings helpers for the display serif.
      // We use "ss01" stylistic set + discretionary ligatures on headlines.
      typography: {},
    },
  },
  plugins: [],
};
