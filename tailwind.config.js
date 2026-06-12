/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Spotify-nahe Palette + Party-Akzente
        ink: '#0b0f1a',
        panel: '#141a2b',
        panel2: '#1c2440',
        accent: '#1db954',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
