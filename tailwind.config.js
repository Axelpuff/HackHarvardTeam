/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        'brand-mint': '#6fdeb6',
        'brand-blue': '#81cff5',
        'brand-dark': '#0d3c42',
        'brand-teal': '#2a5e6d',
      },
      backgroundImage: {
        'gradient-brand': 'linear-gradient(135deg, #6fdeb6 0%, #81cff5 50%, #2a5e6d 100%)',
        'gradient-brand-reverse': 'linear-gradient(135deg, #2a5e6d 0%, #81cff5 50%, #6fdeb6 100%)',
        'gradient-dark': 'linear-gradient(135deg, #0d3c42 0%, #2a5e6d 100%)',
        'gradient-subtle': 'linear-gradient(135deg, #0d3c42 0%, #1a4a52 100%)',
      },
      animation: {
        'blob': 'blob 7s infinite',
      },
      keyframes: {
        blob: {
          '0%': {
            transform: 'translate(0px, 0px) scale(1)',
          },
          '33%': {
            transform: 'translate(30px, -50px) scale(1.1)',
          },
          '66%': {
            transform: 'translate(-20px, 20px) scale(0.9)',
          },
          '100%': {
            transform: 'translate(0px, 0px) scale(1)',
          },
        },
      },
    },
  },
  plugins: [],
};
