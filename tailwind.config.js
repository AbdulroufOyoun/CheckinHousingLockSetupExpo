/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        surface: '#0F1419',
        card: '#1A2332',
        accent: '#2DD4BF',
        muted: '#8B9CB3',
      },
    },
  },
  plugins: [],
};
