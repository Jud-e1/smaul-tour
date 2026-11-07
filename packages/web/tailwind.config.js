/** @type {import('tailwindcss').Config} */

// ── Nsoroma design tokens ──────────────────────────────────────────────────
// Modelled on Airbnb's marketplace UI: white canvas, near-black ink for text
// and primary buttons, hairline greys, and ONE warm accent (the logo's sunset
// pin) used only for search, Reserve/Book and the brand mark.
//
// Legacy colour names (forest / sea / accra / slate / gray) are remapped onto
// this system so every existing page inherits it without markup changes.

const neutral = {
  DEFAULT: '#222222',
  50: '#F7F7F7',
  100: '#EBEBEB',
  200: '#DDDDDD',
  300: '#C1C1C1',
  400: '#B0B0B0',
  500: '#6A6A6A',
  600: '#484848',
  700: '#222222',
  800: '#1A1A1A',
  900: '#111111',
  950: '#0A0A0A',
  dark: '#000000',
  light: '#484848',
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
        // Interactive UI (was blue → now ink, like Airbnb's black buttons/tabs)
        forest: neutral,
        sea: neutral,
        slate: neutral,
        gray: neutral,
        accra: {
          green: '#222222',
          dark: '#000000',
          leaf: '#222222',
          gold: '#F4B63F',
          cream: '#F7F7F7',
        },
        // Brand accent — the logo's sunset pin. Search, Reserve, brand moments only.
        sun: {
          DEFAULT: '#EB5A23',
          50: '#FFF4EE',
          100: '#FFE6D9',
          200: '#FFC9AE',
          300: '#FBA57D',
          400: '#F57E47',
          500: '#EB5A23',
          600: '#D44513',
          700: '#B0370E',
        },
        // Brand green — the logo's leaves. Trust & success: verified, confirmed.
        leaf: {
          DEFAULT: '#1F7A45',
          50: '#ECF7F0',
          100: '#D3EDDC',
          500: '#2E8F57',
          600: '#1F7A45',
          700: '#17603A',
        },
        gold: {
          DEFAULT: '#F4B63F',
          100: '#FDF1D6',
          400: '#F4B63F',
          600: '#C98A12',
        },
        beige: {
          DEFAULT: '#F7F7F7',
          50: '#FAFAFA',
          100: '#F7F7F7',
          200: '#EBEBEB',
          300: '#DDDDDD',
          400: '#B0B0B0',
        },
        canvas: '#FFFFFF',
        fog: '#F7F7F7',
        ink: {
          DEFAULT: '#222222',
          muted: '#6A6A6A',
          soft: '#929292',
        },
        slateink: { DEFAULT: '#222222' },
      },
      borderRadius: {
        card: '16px',
      },
      boxShadow: {
        // Airbnb's layered elevation — only for search, popovers, sticky booking card.
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
