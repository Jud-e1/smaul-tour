/** @type {import('tailwindcss').Config} */

// ── Nsoroma design tokens: "Apple × Stripe" ──────────────────────────────────
// From the Apple and Stripe DESIGN.md files (VoltAgent/awesome-design-md):
// Apple's gallery-grey canvas (#F5F5F7), white tiles and black product bands,
// with Stripe's electric indigo (#533AFD) for every action and its atmospheric
// gradient mesh for heroes and stages.
//
// Legacy colour names (forest / sea / slate / gray / sun / leaf / accra / stone)
// are remapped onto this system so every page inherits it without markup changes.

const stone = {
  DEFAULT: '#1D1D1F',
  50: '#FAFAFC',
  100: '#F5F5F7',
  200: '#E8E8ED',
  300: '#D2D2D7',
  400: '#AEAEB2',
  500: '#86868B',
  600: '#6E6E73',
  700: '#1D1D1F',
  800: '#141416',
  900: '#0A0A0B',
  950: '#000000',
  dark: '#000000',
  light: '#6E6E73',
};

// Stripe indigo: buttons, links, active states, ratings — the one action colour.
const espresso = {
  DEFAULT: '#533AFD',
  50: '#F1EFFF',
  100: '#E2DEFF',
  200: '#C5BDFE',
  300: '#9F92FE',
  400: '#7F6EFD',
  500: '#533AFD',
  600: '#4434D4',
  700: '#2E2B8C',
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
        sans: ['var(--font-body)', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        display: ['var(--font-display)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      colors: {
        forest: stone,
        sea: stone,
        slate: stone,
        gray: stone,
        stone,
        sun: espresso,
        espresso,
        teal: espresso,
        leaf: { DEFAULT: '#533AFD', 50: '#F1EFFF', 100: '#E2DEFF', 500: '#533AFD', 600: '#4434D4', 700: '#2E2B8C' },
        gold: { DEFAULT: '#FFFFFF', 100: '#F5F5F7', 400: '#FFFFFF', 600: '#6E6E73' },
        accra: { green: '#1D1D1F', dark: '#000000', leaf: '#533AFD', gold: '#E8E8ED', cream: '#F5F5F7' },
        beige: {
          DEFAULT: '#F5F5F7',
          50: '#FAFAFC',
          100: '#F5F5F7',
          200: '#E8E8ED',
          300: '#D2D2D7',
          400: '#AEAEB2',
        },
        canvas: '#F5F5F7',
        paper: '#FFFFFF',
        sand: { DEFAULT: '#EDEDF2', dark: '#E2E2E8' },
        fog: '#EDEDF2',
        hairline: '#E0E0E5',
        ink: {
          DEFAULT: '#1D1D1F',
          muted: '#6E6E73',
          soft: '#86868B',
        },
        slateink: { DEFAULT: '#1D1D1F' },
      },
      borderRadius: {
        card: '24px',
        photo: '28px',
      },
      boxShadow: {
        soft: '0 1px 2px rgba(29,29,47,0.05), 0 4px 14px rgba(29,29,47,0.06)',
        card: '0 10px 30px -12px rgba(29,29,47,0.22)',
        float: '0 18px 50px -18px rgba(29,29,47,0.30)',
        sm: '0 1px 2px rgba(29,29,47,0.06)',
        md: '0 4px 14px rgba(29,29,47,0.08)',
        lg: '0 10px 30px -12px rgba(29,29,47,0.22)',
        xl: '0 18px 50px -18px rgba(29,29,47,0.28)',
        '2xl': '0 30px 70px -20px rgba(29,29,47,0.35)',
      },
      maxWidth: {
        page: '1440px',
      },
    },
  },
  plugins: [],
};
