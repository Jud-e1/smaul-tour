/** @type {import('tailwindcss').Config} */

// ── Nsoroma design tokens ──────────────────────────────────────────────────
// "Coastal Daylight": white canvas, deep teal ink for text and primary buttons,
// ocean teal for actions (search, Book/Reserve, links, ratings) and sun yellow
// for badges only. Colours come from the logo's sea and sun.
//
// Legacy colour names (forest / sea / accra / slate / gray) are remapped onto
// this system so every existing page inherits it without markup changes.

const neutral = {
  DEFAULT: '#0B2E33',
  50: '#F4F7F7',
  100: '#EDF2F2',
  200: '#DCE4E5',
  300: '#C5D0D1',
  400: '#A9B8BA',
  500: '#5E7377',
  600: '#2C4A4F',
  700: '#0B2E33',
  800: '#072226',
  900: '#04181B',
  950: '#020F11',
  dark: '#04181B',
  light: '#2C4A4F',
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
        display: ['var(--font-body)', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Interactive UI greys → teal-tinted neutrals
        forest: neutral,
        sea: neutral,
        slate: neutral,
        gray: neutral,
        accra: {
          green: '#0B2E33',
          dark: '#04181B',
          leaf: '#0A7E8C',
          gold: '#FFC93C',
          cream: '#F4F7F7',
        },
        // Action colour — ocean teal from the logo's sea. Search, Book, Reserve, links, ratings.
        sun: {
          DEFAULT: '#0A7E8C',
          50: '#E8F6F7',
          100: '#CDEDEF',
          200: '#9EDBDF',
          300: '#62C2C9',
          400: '#27A2AD',
          500: '#0A7E8C',
          600: '#086B77',
          700: '#075965',
        },
        teal: {
          DEFAULT: '#0A7E8C',
          50: '#E8F6F7',
          100: '#CDEDEF',
          500: '#0A7E8C',
          600: '#086B77',
          700: '#075965',
        },
        // Brand green — the logo's leaves. Trust & success: verified, confirmed.
        leaf: {
          DEFAULT: '#0E8A5A',
          50: '#E7F6EF',
          100: '#C9EBDB',
          500: '#16A06A',
          600: '#0E8A5A',
          700: '#0B6E48',
        },
        // Sun yellow — badges and highlights only.
        gold: {
          DEFAULT: '#FFC93C',
          100: '#FFF3D1',
          400: '#FFC93C',
          600: '#E0A800',
        },
        beige: {
          DEFAULT: '#F4F7F7',
          50: '#FAFCFC',
          100: '#F4F7F7',
          200: '#EDF2F2',
          300: '#DCE4E5',
          400: '#A9B8BA',
        },
        canvas: '#FFFFFF',
        fog: '#F4F7F7',
        ink: {
          DEFAULT: '#0B2E33',
          muted: '#5E7377',
          soft: '#8FA0A3',
        },
        slateink: { DEFAULT: '#0B2E33' },
      },
      borderRadius: {
        card: '16px',
      },
      boxShadow: {
        // Layered elevation — only for search, popovers, sticky booking card.
        soft: '0 0 0 1px rgba(0,0,0,0.02), 0 2px 6px rgba(0,0,0,0.04), 0 4px 8px rgba(0,0,0,0.10)',
        card: '0 6px 16px rgba(0,0,0,0.12)',
        float: '0 0 0 1px rgba(0,0,0,0.02), 0 8px 24px rgba(0,0,0,0.14)',
        sm: '0 1px 2px rgba(0,0,0,0.08)',
        md: '0 2px 8px rgba(0,0,0,0.10)',
        lg: '0 6px 16px rgba(0,0,0,0.12)',
        xl: '0 8px 28px rgba(0,0,0,0.14)',
        '2xl': '0 16px 40px rgba(0,0,0,0.18)',
      },
      maxWidth: {
        page: '1760px',
      },
    },
  },
  plugins: [],
};
