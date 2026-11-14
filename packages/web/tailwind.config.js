/** @type {import('tailwindcss').Config} */

// ── Nsoroma design tokens: "Warm Paper" ─────────────────────────────────────
// Grounded in Oura's DESIGN.md (VoltAgent/awesome-design-md): a warm-paper
// beige canvas, earthy stone/espresso neutrals, hairline rules, a light serif
// for headlines and a quiet grotesque for everything else. No saturated hues —
// colour comes from photography.
//
// Legacy colour names (forest / sea / slate / gray / sun / leaf / accra) are
// remapped onto this system so every page inherits it without markup changes.

const stone = {
  DEFAULT: '#1C1B1A',
  50: '#FAF6EF',
  100: '#F3ECE1',
  200: '#E6DBCA',
  300: '#D3C6B2',
  400: '#A89C8C',
  500: '#7D7469',
  600: '#4A4741',
  700: '#1C1B1A',
  800: '#141312',
  900: '#0D0C0B',
  950: '#080807',
  dark: '#0D0C0B',
  light: '#4A4741',
};

// Warm espresso-brown: links, active states, ratings — the only "accent".
const espresso = {
  DEFAULT: '#3D2F26',
  50: '#F3ECE1',
  100: '#E9DECD',
  200: '#D6C4AB',
  300: '#B89E80',
  400: '#8C7258',
  500: '#3D2F26',
  600: '#2E231C',
  700: '#211913',
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
        leaf: { DEFAULT: '#4A4741', 50: '#EFE6D8', 100: '#E6DBCA', 500: '#4A4741', 600: '#4A4741', 700: '#1C1B1A' },
        gold: { DEFAULT: '#FFFDF9', 100: '#F3ECE1', 400: '#FFFDF9', 600: '#4A4741' },
        accra: { green: '#1C1B1A', dark: '#0D0C0B', leaf: '#3D2F26', gold: '#EFE6D8', cream: '#F7F1E8' },
        beige: {
          DEFAULT: '#F7F1E8',
          50: '#FBF8F3',
          100: '#F7F1E8',
          200: '#EFE6D8',
          300: '#E6DBCA',
          400: '#D3C6B2',
        },
        canvas: '#F7F1E8',
        paper: '#FFFDF9',
        sand: { DEFAULT: '#EFE6D8', dark: '#E6DBCA' },
        fog: '#EFE6D8',
        hairline: '#E1D8CA',
        ink: {
          DEFAULT: '#1C1B1A',
          muted: '#6F675E',
          soft: '#9A9187',
        },
        slateink: { DEFAULT: '#1C1B1A' },
      },
      borderRadius: {
        card: '24px',
        photo: '28px',
      },
      boxShadow: {
        soft: '0 1px 2px rgba(60,40,20,0.05), 0 4px 14px rgba(60,40,20,0.06)',
        card: '0 10px 30px -12px rgba(60,40,20,0.22)',
        float: '0 18px 50px -18px rgba(60,40,20,0.30)',
        sm: '0 1px 2px rgba(60,40,20,0.06)',
        md: '0 4px 14px rgba(60,40,20,0.08)',
        lg: '0 10px 30px -12px rgba(60,40,20,0.22)',
        xl: '0 18px 50px -18px rgba(60,40,20,0.28)',
        '2xl': '0 30px 70px -20px rgba(60,40,20,0.35)',
      },
      maxWidth: {
        page: '1440px',
      },
    },
  },
  plugins: [],
};
