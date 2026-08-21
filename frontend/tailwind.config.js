/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          bg: "#040805",
          card: "#08100b",
          cardHover: "#0d1a12",
          border: "#113320",
          borderBright: "#00f076",
          emerald: "#00f076",
          neon: "#00ff88",
          darkEmerald: "#051a10",
          gold: "#ffee00",
          yellow: "#ffee00",
          pink: "#ff2a85",
          magenta: "#ff006e",
          cyan: "#00e5ff",
          red: "#ff4d4d",
          textMuted: "#799e89",
          textMain: "#e2ede6"
        }
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', '"Fira Code"', 'monospace'],
        display: ['Syne', 'Inter', 'sans-serif']
      },
      boxShadow: {
        'glow-emerald': '0 0 30px -5px rgba(0, 240, 118, 0.4)',
        'glow-neon': '0 0 40px -5px rgba(0, 255, 136, 0.6)',
        'glow-gold': '0 0 35px -5px rgba(255, 238, 0, 0.5)',
        'glow-pink': '0 0 35px -5px rgba(255, 42, 133, 0.5)',
        'hacker-card': '4px 4px 0px 0px #113320',
        'sticker-gold': '3px 3px 0px 0px #ffee00',
        'sticker-pink': '3px 3px 0px 0px #ff2a85',
        'sticker-emerald': '3px 3px 0px 0px #00f076'
      }
    },
  },
  plugins: [],
}
