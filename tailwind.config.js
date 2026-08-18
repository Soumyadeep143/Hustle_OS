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
        slate: {
          900: '#0f172a',
          800: '#1e293b',
          700: '#334155',
          600: '#475569',
          400: '#cbd5e1',
          300: '#e2e8f0',
        },
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
          '0%, 100%': { boxShadow: '0 0 20px rgba(52, 152, 219, 0.5)' },
          '50%': { boxShadow: '0 0 40px rgba(52, 152, 219, 0.8)' },
        },
      },
      animation: {
        fadeIn: 'fadeIn 0.6s ease-in-out',
        slideInFromLeft: 'slideInFromLeft 0.6s ease-out',
        voiceWave: 'voiceWave 0.6s ease-in-out infinite',
        pulseGlow: 'pulseGlow 2s ease-in-out infinite',
      },
      backgroundImage: {
        'gradient-hero': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        'gradient-subtle': 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
        'gradient-success': 'linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%)',
      },
    },
  },
  plugins: [],
}
