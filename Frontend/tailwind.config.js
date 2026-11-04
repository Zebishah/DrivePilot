/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        poppins: ["Poppins", "sans-serif"],
        inter: ["Inter", "sans-serif"],
      },

      colors: {
        defaultColor: "#FFC801",
        primary: {
          DEFAULT: "#FFC801",
          //// Example for Adding Shades For Colors  also for hovers and disable etc ////
          50: "#F0F9FF",
          100: "#E0F2FE",
        },
        secondary: {
          DEFAULT: "#114C5A",
          // 50: "#F0F9FF",
          // 100: "#E0F2FE",
        },
        success: {
          DEFAULT: "#23765B",
          // 50: "#FEFCE8",
          // 100: "#FEF9C3",
        },
        error: {
          DEFAULT: "#B63838",
          // 50: "#FEF2F2",
          // 100: "#FEE2E2",
        },
        warning: {
          DEFAULT: "#805800",
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
