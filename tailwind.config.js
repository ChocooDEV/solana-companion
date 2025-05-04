module.exports = {
    content: [
      "./app/**/*.{js,ts,jsx,tsx}",
      "./pages/**/*.{js,ts,jsx,tsx}",
      "./components/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
      extend: {
        animation: {
          'fade-in': 'fadeIn 1s ease-out',
          'bounce': 'bounce 2s infinite',
          fadeIn: 'fadeIn 1s ease-in-out',
          slideUp: 'slideUp 0.8s ease-in-out',
          slideRight: 'slideRight 0.8s ease-in-out',
          float: 'float 3s ease-in-out infinite',
          pulse: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        },
        keyframes: {
          fadeIn: {
            '0%': { opacity: '0' },
            '100%': { opacity: '1' },
          },
          slideUp: {
            '0%': { transform: 'translateY(20px)', opacity: '0' },
            '100%': { transform: 'translateY(0)', opacity: '1' },
          },
          slideRight: {
            '0%': { transform: 'translateX(-20px)', opacity: '0' },
            '100%': { transform: 'translateX(0)', opacity: '1' },
          },
          float: {
            '0%, 100%': { transform: 'translateY(0)' },
            '50%': { transform: 'translateY(-10px)' },
          },
        },
        transitionDelay: {
          '200': '200ms',
          '300': '300ms',
          '500': '500ms',
          '700': '700ms',
          '900': '900ms',
        },
      },
    },
    variants: {
      extend: {
        animation: ['hover', 'focus'],
      },
    },
    plugins: [
      function({ addUtilities }) {
        const newUtilities = {
          '.animation-delay-200': {
            'animation-delay': '200ms',
          },
          '.animation-delay-300': {
            'animation-delay': '300ms',
          },
          '.animation-delay-500': {
            'animation-delay': '500ms',
          },
          '.animation-delay-700': {
            'animation-delay': '700ms',
          },
          '.animation-delay-900': {
            'animation-delay': '900ms',
          },
        }
        addUtilities(newUtilities)
      }
    ],
  }