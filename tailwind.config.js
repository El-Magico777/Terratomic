// tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{html,ts,js}"],
  theme: {
    extend: {
      fontFamily: {
        military: ['"Black Ops One"', "cursive"],
        ocr: ['"Azeret Mono"', "monospace"],
      },
      colors: {
        "olive-green": "#6B8E23",
        "dark-gray": "#36454F",
        steel: "#4682B4",
        tan: "#D2B48C",
        "muted-red": "#CC5500",
        "muted-orange": "#FF8C00",
        "crt-green": "#00FF00",
      },
    },
  },
  plugins: [],
  darkMode: "class",
};
