/** @type {import('tailwindcss').Config} */
export default {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: "#0055ff",
        secondary: "#edeff2",
        background: "#ffffff",
        graident: "#02b4fa",
      },
      fontSize: {
        xsm: 11,
        xs: 13,
        sm: 15,
        base: 16,
        lg: 22,
      },
      radius: {
        cardRadius: 4,
        inputRadius: 20,
      },
      textColor: {},
      spacing: {
        "screen-edge": "16px",
      },
    },
  },
  plugins: [],
};
