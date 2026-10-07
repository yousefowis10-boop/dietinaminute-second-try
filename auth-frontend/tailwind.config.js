module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "IBM Plex Sans Arabic", "system-ui", "sans-serif"],
        ar: ["IBM Plex Sans Arabic", "Inter", "system-ui", "sans-serif"],
      },
      colors: {
        brand: { DEFAULT: "#1f6f5c", dark: "#175646", soft: "#e5f1ed", ink: "#16211d" },
        page: "#f5f6f4",
        line: "#e6e9e6",
        muted: "#6b7570",
        ok: { DEFAULT: "#2f9e6e", soft: "#e4f5ec" },
        warn: { DEFAULT: "#b7791f", soft: "#fdf4e3" },
        bad: { DEFAULT: "#c2410c", soft: "#fdece4" },
        ai: { DEFAULT: "#5b4bd6", soft: "#efedfc" },
      },
      width: {
        "2/7": "28.5714286%",
        "5/7": "71.4285714%",
      },
    },
  },
  plugins: [],
};
