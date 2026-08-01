/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './features/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      fontFamily: {
        heading: ["'Fraunces'", 'Georgia', 'serif'],
        body: ["'General Sans'", '-apple-system', 'sans-serif'],
        accent: ["'Cormorant Garamond'", 'Georgia', 'serif'],
        mascot: ["'Shantell Sans'", 'cursive', 'sans-serif'],
        mono: ["'Martian Mono'", 'monospace'],
      },
      colors: {
        cherry: {
          bloom: '#C73A57',
          deep: '#A61F45',
          accent: '#E84D72',
          glow: '#F07392',
          soft: '#D95A79',
        },
        rose: {
          pale: '#FFF7F8',
          mist: '#FFF3F5',
          blush: '#FFE4EB',
          grid: '#FAD7E0',
          warm: '#FFFDFD',
        },
        text: {
          primary: '#2A1D22',
          secondary: '#66545B',
          muted: '#BFAFB5',
          disabled: '#D9CDD1',
        },
        status: {
          success: '#63C58B',
          warning: '#FFBE5C',
          danger: '#D94C61',
          info: '#8CCBFF',
        },
      },
      borderRadius: {
        card: '24px',
        button: '20px',
        input: '18px',
        pill: '9999px',
      },
    },
  },
  plugins: [],
};

