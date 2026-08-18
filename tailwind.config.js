/** @type {import('tailwindcss').Config} */
export default {
  content: {
    files: [
      "./index.html",
      "./src/**/*.{js,ts,jsx,tsx}",
    ],
  },
  theme: {
    extend: {
      colors: {
        primary: '#3498db',
        secondary: '#2c3e50',
        success: '#2ecc71',
      },
      fontFamily: {
        geist: ['Geist', 'system-ui', 'sans-serif'],
        inter: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideInFromLeft: {
          '0%': { transform: 'translateX(-20px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        voiceWave: {
          '0%, 100%': { scaleY: '1' },
          '50%': { scaleY: '0.5' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(217, 70, 239, 0.5)' },
          '50%': { boxShadow: '0 0 45px rgba(217, 70, 239, 0.85)' },
        },
        orbBreathe: {
          '0%, 100%': {
            transform: 'scale(1)',
            boxShadow: '0 0 60px 10px rgba(168, 85, 247, 0.45), 0 0 120px 30px rgba(236, 72, 153, 0.2)',
          },
          '50%': {
            transform: 'scale(1.06)',
            boxShadow: '0 0 80px 20px rgba(217, 70, 239, 0.6), 0 0 160px 50px rgba(236, 72, 153, 0.3)',
          },
        },
        orbSpin: {
          from: { transform: 'rotate(0deg)' },
          to: { transform: 'rotate(360deg)' },
        },
        orbSpinReverse: {
          from: { transform: 'rotate(360deg)' },
          to: { transform: 'rotate(0deg)' },
        },
      },
      animation: {
        fadeIn: 'fadeIn 0.6s ease-in-out',
        slideInFromLeft: 'slideInFromLeft 0.6s ease-out',
        voiceWave: 'voiceWave 0.6s ease-in-out infinite',
        pulseGlow: 'pulseGlow 2s ease-in-out infinite',
        orbBreathe: 'orbBreathe 3s ease-in-out infinite',
        orbSpin: 'orbSpin 8s linear infinite',
        orbSpinReverse: 'orbSpinReverse 12s linear infinite',
      },
      backgroundImage: {
        'gradient-hero': 'linear-gradient(135deg, #9333ea 0%, #db2777 100%)',
        'gradient-subtle': 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
        'gradient-success': 'linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%)',
        'gradient-orb': 'conic-gradient(from 0deg, #a855f7, #ec4899, #d946ef, #a855f7)',
      },
    },
  },
  plugins: [],
}
