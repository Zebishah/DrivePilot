/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        harabara: ["Harabara", "sans-serif"],
        poppins: ["Poppins", "sans-serif"],
        inter: ["Inter", "sans-serif"],
      },

      colors: {
        primary: {
          DEFAULT: "#5EC2D2",
          //// Example for Adding Shades For Colors  also for hovers and disable etc ////
          50: "#F0F9FF",
          100: "#E0F2FE",
        },
        secondary: {
          DEFAULT: "#15172C",
          // 50: "#F0F9FF",
          // 100: "#E0F2FE",
        },
        success: {
          DEFAULT: "#FFBB38",
          // 50: "#FEFCE8",
          // 100: "#FEF9C3",
        },
        error: {
          DEFAULT: "#FF5900",
          // 50: "#FEF2F2",
          // 100: "#FEE2E2",
        },
        warning: {
          DEFAULT: "#FCAD14",
          // 50: "#FFFBEB",
          // 100: "#FEF3C7",
        },
        input: {
          DEFAULT: "#484848",
        },
        white: "#FFFFFF",
        black: "#000000",
      },
    },
  },
  plugins: [],
};
