/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        canvasDark: '#010120',
        surfaceDarkSoft: '#26263a',
        surfaceDarkFill: '#313641',
        canvas: '#ffffff',
        hairline: '#ebebeb',
        ink: '#000000',
        body: '#71717a',
        bodyMuted: '#999999',
        accentMint: '#c8f6f9',
        accentPeriwinkle: '#bdbbff',
        accentOrange: '#fc4c02',
        accentMagenta: '#ef2cc1',
      },
      fontFamily: {
        display: ['GeistSans', 'sans-serif'],
        mono: ['GeistMono', 'monospace'],
      },
      borderRadius: {
        DEFAULT: '4px',
        sm: '4px',
        md: '8px',
        lg: '12px',
        full: '9999px',
      },
    },
  },
  plugins: [],
};
