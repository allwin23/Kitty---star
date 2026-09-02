import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/features/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        heading: ["'Fraunces'", 'Georgia', 'serif'],
        body: ["'General Sans'", '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
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
          bg: '#F63E5F',
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
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        wiggle: {
          '0%, 100%': { transform: 'rotate(-4deg)' },
          '50%': { transform: 'rotate(4deg)' },
        },
        pulseGlow: {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.6', transform: 'scale(1.05)' },
        },
      },
      animation: {
        float: 'float 3s ease-in-out infinite',
        wiggle: 'wiggle 2s ease-in-out infinite',
        pulseGlow: 'pulseGlow 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

export default config;
