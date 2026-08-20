import type { Config } from 'tailwindcss';

export default {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    '../../packages/ui/src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#000000',
        'accent-orange': '#fc4c02',
        'accent-magenta': '#ef2cc1',
        'accent-periwinkle': '#bdbbff',
        'accent-mint': '#c8f6f9',
        canvas: '#ffffff',
        hairline: '#ebebeb',
        'canvas-dark': '#010120',
        'surface-dark-soft': '#26263a',
        'surface-dark-fill': '#313641',
        ink: '#000000',
        body: '#71717a',
        'body-muted': '#999999',
        'on-dark': '#ffffff',
        'on-primary': '#ffffff',
      },
      fontFamily: {
        display: ['var(--font-geist-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'monospace'],
      },
      borderRadius: {
        none: '0px',
        xs: '3.25px',
        sm: '4px',
        md: '8px',
        full: '9999px',
      },
      maxWidth: {
        layout: '1280px',
      },
    },
  },
  plugins: [],
} satisfies Config;
