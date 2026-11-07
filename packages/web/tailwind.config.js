/** @type {import('tailwindcss').Config} */

// ── Nsoroma palette — taken from the logo ──────────────────────────────────
// forest  → brand + primary actions (the logo's leaves)
// sun     → ceremonial accent: hero CTA, search trigger, active indicators (the pin)
// gold    → decorative only: stars, small badges (the sunset)
// ink/canvas/linen → neutrals
const forest = {
  DEFAULT: '#185634',
  50: '#EEF6F0',
  100: '#D5EADB',
  200: '#ABD4B8',
  300: '#79B78F',
  400: '#4A9867',
  500: '#2E7D4F',
  600: '#1F6A40',
  700: '#185634',
  800: '#12432A',
  900: '#0C2F1E',
  950: '#081F14',
  dark: '#12432A',
  light: '#2E7D4F',
};

module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-body)', 'Inter', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'var(--font-body)', 'system-ui', 'sans-serif'],
      },
      colors: {
        forest,
        sea: forest,
        accra: {
          green: '#185634',
          dark: '#12432A',
          leaf: '#2E7D4F',
          gold: '#F4B63F',
          cream: '#F4F1EA',
        },
        sun: {
          DEFAULT: '#F26B1D',
          50: '#FFF4EC',
          100: '#FFE3CC',
          200: '#FFC79C',
          300: '#FDA86A',
          400: '#FB8C3F',
          500: '#F26B1D',
          600: '#D9550E',
          700: '#B3430C',
        },
        gold: {
          DEFAULT: '#F4B63F',
          100: '#FDF1D6',
          400: '#F4B63F',
          600: '#C98A12',
        },
        beige: {
          DEFAULT: '#F4F1EA',
          50: '#FBFAF7',
          100: '#F4F1EA',
          200: '#E9E4D8',
          300: '#DAD3C2',
          400: '#BFB59E',
        },
        canvas: '#F7F7F4',
        ink: {
          DEFAULT: '#16201A',
          muted: '#5E6862',
          soft: '#8A928D',
        },
        slateink: {
          DEFAULT: '#16201A',
        },
      },
      borderRadius: {
        card: '20px',
      },
      boxShadow: {
        // Flat by default; layered shadow only for elevated controls (search, popovers, sticky booking).
        soft: '0 0 0 1px rgba(22,32,26,0.04), 0 2px 6px rgba(22,32,26,0.04), 0 4px 12px rgba(22,32,26,0.06)',
        card: '0 0 0 1px rgba(22,32,26,0.04), 0 2px 6px rgba(22,32,26,0.05), 0 8px 24px rgba(22,32,26,0.08)',
        float: '0 0 0 1px rgba(22,32,26,0.03), 0 8px 20px rgba(22,32,26,0.08), 0 24px 48px -12px rgba(22,32,26,0.18)',
      },
      letterSpacing: {
        display: '-0.03em',
      },
    },
  },
  plugins: [],
};
