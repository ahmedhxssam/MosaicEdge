/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Base canvas — midnight navy / deep charcoal
        ink: {
          950: '#070b14',
          900: '#0b111d',
          850: '#0e1626',
          800: '#121c30',
          750: '#16223a',
          700: '#1b2a47',
        },
        slatepanel: {
          DEFAULT: '#101a2c',
          raised: '#15223a',
          hover: '#1a2a44',
        },
        // Severity system
        critical: '#f43f5e',
        high: '#fb923c',
        medium: '#fbbf24',
        low: '#64748b',
        verified: '#34d399',
        contradiction: '#c084fc',
        offline: '#6b7280',
        syncing: '#22d3ee',
        accent: {
          DEFAULT: '#38bdf8',
          soft: '#7dd3fc',
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'sans-serif',
        ],
        mono: [
          'ui-monospace',
          'SFMono-Regular',
          'Menlo',
          'Monaco',
          'Consolas',
          'monospace',
        ],
      },
      boxShadow: {
        panel: '0 1px 0 0 rgba(255,255,255,0.03), 0 8px 24px -12px rgba(0,0,0,0.7)',
        glow: '0 0 0 1px rgba(56,189,248,0.25), 0 0 24px -4px rgba(56,189,248,0.35)',
      },
      keyframes: {
        'pulse-ring': {
          '0%': { boxShadow: '0 0 0 0 rgba(244,63,94,0.45)' },
          '70%': { boxShadow: '0 0 0 10px rgba(244,63,94,0)' },
          '100%': { boxShadow: '0 0 0 0 rgba(244,63,94,0)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'pulse-ring': 'pulse-ring 2s infinite',
        shimmer: 'shimmer 1.5s infinite',
        'fade-in': 'fade-in 0.25s ease-out',
      },
    },
  },
  plugins: [],
};
