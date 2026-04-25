import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy:   '#1A3A6B',
        yellow: '#F5C84A',
      },
    },
  },
  plugins: [],
}

export default config
