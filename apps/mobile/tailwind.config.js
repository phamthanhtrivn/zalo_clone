/** @type {import('tailwindcss').Config} */
export default {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: "#0068FF",
        accent: "#ebecf0",
        chatMe: "#0068FF",
        chatOther: "#F3F4F6",
      },
      textColor: {
        
      }
    },
  },
  plugins: [],
};
