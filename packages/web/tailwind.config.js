/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // ── Nsoroma 3-colour palette ─────────────────────────────────────
        // Sea Blue  (#2E8B9E)  → primary actions, buttons, links, headers
        // Beige     (#F5F0E6)  → backgrounds, cards, secondary sections
        // White     (#FFFFFF)  → primary bg, text on dark, contrast areas
        accra: {
          green:  '#2E8B9E',   // was dark forest green → now Sea Blue
          dark:   '#246F7E',   // darker Sea Blue for hover states
          leaf:   '#3AA3B8',   // lighter Sea Blue for links & accents
          gold:   '#F5F0E6',   // was yellow gold → now Beige (badge/chip bg)
          cream:  '#F5F0E6',   // Beige – cards, secondary sections
        },
        // Convenience aliases used directly in some components
        sea: {
          DEFAULT: '#2E8B9E',
          dark:    '#246F7E',
          light:   '#3AA3B8',
          50:      '#EBF6F9',
          100:     '#C9E9EF',
          200:     '#A0D5DF',
          300:     '#6FBFCD',
          400:     '#3AA3B8',
          500:     '#2E8B9E',
          600:     '#246F7E',
          700:     '#1B545F',
          800:     '#123940',
          900:     '#091D20',
        },
        beige: {
          DEFAULT: '#F5F0E6',
          50:      '#FDFCF9',
          100:     '#F5F0E6',
          200:     '#EDE4D2',
          300:     '#DDD3BB',
          400:     '#C9BC9E',
        },
      },
    },
  },
  plugins: [],
};
