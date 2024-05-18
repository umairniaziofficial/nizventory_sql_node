/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./views/**/*.{html,js,ejs}"],
  theme: {
    extend: {
      textColor:
      {
        myGreen: "#33E67A",
        myGray: "#dcdffe"
       
      },
      backgroundColor:
      {
        myCardBg: "#1B1C20",
        myBodyBg: "#18181C",
        myGreen: "#33E67A",
      }
    },
  },
  plugins: [],
}