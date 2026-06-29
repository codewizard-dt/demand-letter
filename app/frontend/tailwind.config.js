/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#193D3D',
          gold: '#A18050',
        },
        secondary: {
          DEFAULT: '#346E4A',
          steel: '#27455C',
        },
        bg: '#F0F1E8',
        surface: '#F9FFFA',
        border: '#E8E5DC',
        accent: '#ABDFD4',
        error: '#B5006A',
        'text-muted': '#696969',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif'],
        serif: ['Playfair Display', 'ui-serif', 'Georgia', 'serif'],
      },
      borderRadius: {
        sm: '2px',
        md: '10px',
        lg: '50px',
        circle: '50%',
      },
      boxShadow: {
        sm: 'rgba(25, 61, 61, 0.10) 0px 1px 12px 0px',
        md: 'rgba(25, 61, 61, 0.20) 0px 5px 25px 0px',
        lg: 'rgba(25, 61, 61, 0.30) 0px 10px 50px 0px',
      },
    },
  },
  plugins: [],
};
