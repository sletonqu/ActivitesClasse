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
            boxShadow: "0 0 0 3px rgba(14, 165, 233, 0.4)",
          },
        },
        "pulse-slow-orange": {
          "0%, 100%": {
            opacity: "1",
            boxShadow: "0 0 0 0 rgba(232, 158, 69, 0)",
          },
          "50%": {
            opacity: "0.55",
            boxShadow: "0 0 0 3px rgba(232, 158, 69, 0.45)",
          },
        },
        "pulse-slow-green": {
          "0%, 100%": {
            opacity: "1",
            boxShadow: "0 0 0 0 rgba(23, 152, 88, 0)",
          },
          "50%": {
            opacity: "0.55",
            boxShadow: "0 0 0 3px rgba(23, 152, 88, 0.45)",
          },
        },
        "pulse-slow-blue": {
          "0%, 100%": {
            opacity: "1",
            boxShadow: "0 0 0 0 rgba(71, 73, 235, 0)",
          },
          "50%": {
            opacity: "0.55",
            boxShadow: "0 0 0 3px rgba(71, 73, 235, 0.45)",
          },
        },
        "pulse-slow-indigo": {
          "0%, 100%": {
            opacity: "1",
            boxShadow: "0 0 0 0 rgba(99, 102, 241, 0)",
          },
          "50%": {
            opacity: "0.55",
            boxShadow: "0 0 0 3px rgba(99, 102, 241, 0.35)",
          },
        },
        "pulse-slow-red": {
          "0%, 100%": {
            opacity: "1",
            boxShadow: "0 0 0 0 rgba(229, 57, 94, 0)",
          },
          "50%": {
            opacity: "0.55",
            boxShadow: "0 0 0 3px rgba(229, 57, 94, 0.45)",
          },
        },
      },
      animation: {
        "pulse-slow": "pulse-slow 3.2s ease-in-out infinite",
        "pulse-slow-orange": "pulse-slow-orange 3.2s ease-in-out infinite",
        "pulse-slow-green": "pulse-slow-green 3.2s ease-in-out infinite",
        "pulse-slow-blue": "pulse-slow-blue 3.2s ease-in-out infinite",
        "pulse-slow-indigo": "pulse-slow-indigo 3.2s ease-in-out infinite",
        "pulse-slow-red": "pulse-slow-red 3.2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
