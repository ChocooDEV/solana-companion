module.exports = {
    theme: {
      extend: {
        animation: {
          'fade-in': 'fadeIn 1s ease-out',
          'bounce': 'bounce 2s infinite',
        },
        keyframes: {
          fadeIn: {
            '0%': { opacity: 0 },
            '100%': { opacity: 1 },
          },
        },
      },
    },
  }