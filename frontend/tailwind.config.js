/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}"
  ],
  theme: {
    extend: {
      keyframes: {
        "pulse-slow": {
          "0%, 100%": {
            opacity: "1",
            boxShadow: "0 0 0 0 rgba(14, 165, 233, 0)",
          },
          "50%": {
            opacity: "0.45",
            boxShadow: "0 0 0 4px rgba(14, 165, 233, 0.4)",
          },
        },
      },
      animation: {
        "pulse-slow": "pulse-slow 3.2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
