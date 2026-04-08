/** @type {import('tailwindcss').Config} */
export default {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
<<<<<<< HEAD
        primary: "#0068FF",
        accent: "#ebecf0",
        chatMe: "#0068FF",
        chatOther: "#F3F4F6",
      },
      textColor: {
        
      }
=======
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
>>>>>>> origin/main
    },
  },
  plugins: [],
};
