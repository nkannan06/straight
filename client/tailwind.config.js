// Design tokens transcribed from the "Straight" Claude Design package (Round 3,
// locked: Schibsted Grotesk + Marcellus · "The Sequence" logo · Lattice backs ·
// Frame table). See /design-reference/Straight.dc.html for the source mockups.
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: '#1E2015',
          elevated: '#282B1C',
          'elevated-2': '#343824',
        },
        ivory: '#F2EFE4',
        text: {
          primary: '#F2EFE4',
          secondary: '#ADAE97',
          tertiary: '#74765F',
          'on-ivory': '#1E2015',
        },
        accent: {
          olive: '#8F9E57',
          'olive-deep': '#5F6B38',
          gold: '#E0B95C',
          'gold-deep': '#B8933F',
        },
        fold: '#C4534A',
        call: '#565A45',
        raise: '#8F9E57',
        warning: '#D99A3A',
      },
      fontFamily: {
        display: ['Marcellus', 'Georgia', 'serif'],
        sans: ['"Schibsted Grotesk"', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      fontSize: {
        'large-title': ['40px', { lineHeight: '44px' }],
        title: ['28px', { lineHeight: '32px' }],
        headline: ['19px', { lineHeight: '24px', fontWeight: '600' }],
        body: ['16px', { lineHeight: '22px' }],
        subheadline: ['14px', { lineHeight: '20px' }],
        caption: ['12px', { lineHeight: '16px', letterSpacing: '0.06em' }],
      },
      borderRadius: {
        chip: '8px',
        btn: '14px',
        card: '20px',
        sheet: '28px',
      },
      boxShadow: {
        card: '0 2px 12px rgba(0,0,0,0.35)',
        sheet: '0 -4px 24px rgba(0,0,0,0.45)',
        modal: '0 8px 40px rgba(0,0,0,0.55)',
        'glow-gold': '0 0 20px rgba(224,185,92,0.35)',
      },
      maxWidth: {
        phone: '390px',
      },
    },
  },
  plugins: [],
};
