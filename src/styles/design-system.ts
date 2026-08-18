export const COLORS = {
  primary: '#3498db',
  secondary: '#2c3e50',
  success: '#2ecc71',
  warning: '#f39c12',
  danger: '#e74c3c',
  light: '#ecf0f1',
  dark: '#2c3e50',
  slate: {
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a',
  },
};

export const TYPOGRAPHY = {
  fontFamilies: {
    display: 'Geist, system-ui, sans-serif',
    body: 'Inter, system-ui, sans-serif',
    mono: 'JetBrains Mono, monospace',
  },
  sizes: {
    h1: { size: '2.5rem', weight: 700, lineHeight: '1.2' },
    h2: { size: '2rem', weight: 700, lineHeight: '1.3' },
    h3: { size: '1.5rem', weight: 600, lineHeight: '1.4' },
    h4: { size: '1.25rem', weight: 600, lineHeight: '1.4' },
    body: { size: '1rem', weight: 400, lineHeight: '1.6' },
    small: { size: '0.875rem', weight: 400, lineHeight: '1.5' },
    xs: { size: '0.75rem', weight: 400, lineHeight: '1.4' },
  },
};

export const SPACING = {
  xs: '0.25rem',
  sm: '0.5rem',
  md: '1rem',
  lg: '1.5rem',
  xl: '2rem',
  '2xl': '3rem',
  '3xl': '4rem',
};

export const GRADIENTS = {
  hero: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  subtle: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
  success: 'linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%)',
};

export const ANIMATIONS = {
  fadeIn: 'fadeIn 0.6s ease-in-out',
  slideInFromLeft: 'slideInFromLeft 0.6s ease-out',
  voiceWave: 'voiceWave 0.6s ease-in-out infinite',
  pulseGlow: 'pulseGlow 2s ease-in-out infinite',
};

export const SHADOWS = {
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
  glow: '0 0 20px rgba(52, 152, 219, 0.3)',
};
