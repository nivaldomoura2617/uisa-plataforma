import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        uisa: {
          orange:       '#F07022',
          yellow:       '#F5C400',
          green:        '#007960',
          'green-l':    '#E6F4F1',
          red:          '#C0392B',
          'gray-dark':  '#4A4A4A',
          gray:         '#9E9E9E',
        },
      },
      fontFamily: {
        sans: ['Roboto', 'sans-serif'],
      },
      backgroundImage: {
        'uisa-gradient': 'linear-gradient(135deg, #C0392B 0%, #F07022 50%, #F5C400 100%)',
      },
    },
  },
  plugins: [],
}

export default config
