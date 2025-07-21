/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        'roboto': ['Roboto', 'sans-serif'],
      },
      colors: {
        // Custom grays
        gray: {
          373737: '#373737',
          373738: '#373738',
          666666: '#666666', 
          656565: '#656565',
          666: '#666',
          'a6': '#A6A6A6',
          'cd': '#CDCDCD',
          'f9': '#F9F9F9',
          'e4': '#e4e4e4',
          'f2': '#f2f2f2',
        },
        // Custom purples
        purple: {
          976987: '#976987',
          986988: '#986988',
          916886: '#916B86',
          916885: '#916B85',
        },
        // Custom yellows
        yellow: {
          'f6c657': '#F6C657',
          'f4bd3f': '#f4bd3f',
        }
      },
      spacing: {
        '3.25': '0.8125rem',
        '7': '1.75rem',
        '7.25': '1.8125rem',
        '11.25': '2.8125rem',
        '13': '3.25rem',
        '15': '3.75rem',
        '15.5': '3.875rem',
        '17': '4.25rem',
        '18': '4.5rem',
        '19': '4.75rem',
        '30': '7.5rem',
        '31': '7.75rem',
        '31.75': '7.9375rem',
        '38': '9.5rem',
        '44': '11rem',
        '54': '13.5rem',
        '66': '16.5rem',
        '110': '27.5rem',
        '175': '43.75rem',
      },
      borderWidth: {
        '3': '3px',
      },
      fontSize: {
        '1.3rem': '1.3rem',
        '1.45rem': '1.45rem',
        '1.5rem': '1.5rem',
        '1.63rem': '1.63rem',
        '1.69rem': '1.69rem',
        '1.7rem': '1.7rem',
        '1.8rem': '1.8rem',
        '1.94rem': '1.94rem',
        '2rem': '2rem',
        '2.07rem': '2.07rem',
        '2.1rem': '2.1rem',
        '2.13rem': '2.13rem',
        '2.19rem': '2.19rem',
        '2.25rem': '2.25rem',
        '2.38rem': '2.38rem',
        '2.5rem': '2.5rem',
        '2.7rem': '2.7rem',
        '2.95rem': '2.95rem',
        '3.25rem': '3.25rem',
        '3.7rem': '3.7rem',
        '4.5rem': '4.5rem',
        '5rem': '5rem',
      },
      maxWidth: {
        '56.3rem': '56.3rem',
        '112.5rem': '112.5rem',
      }
    },
  },
  plugins: [],
}