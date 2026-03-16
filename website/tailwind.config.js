/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        surface: {
          0: '#050506',
          1: '#0a0a0c',
          2: '#111114',
          3: '#18181c',
          4: '#1f1f24',
        },
        accent: {
          DEFAULT: '#00e5a0',
          dim: '#00e5a0',
          muted: 'rgba(0, 229, 160, 0.15)',
          border: 'rgba(0, 229, 160, 0.25)',
        },
        threat: {
          safe: '#00e5a0',
          warn: '#ffb224',
          danger: '#ff4d4d',
        },
        neutral: {
          50: '#fafafa',
          100: '#e5e5e6',
          200: '#ccccce',
          300: '#a1a1a5',
          400: '#71717a',
          500: '#52525b',
          600: '#3f3f46',
          700: '#2c2c31',
          800: '#1c1c20',
          900: '#111114',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease forwards',
        'fade-in-up': 'fadeInUp 0.5s ease forwards',
        'scan-line': 'scanLine 3s ease-in-out infinite',
        'terminal-blink': 'terminalBlink 1s step-end infinite',
        'pulse-dot': 'pulseDot 2s ease-in-out infinite',
        'typing': 'typing 2s steps(30) forwards',
        'radar-sweep': 'radarSweep 3s linear infinite',
        'glow-pulse': 'glowPulse 2.5s ease-in-out infinite',
        'slide-up': 'slideUp 0.3s ease forwards',
        'counter': 'counter 2s ease-out forwards',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scanLine: {
          '0%': { transform: 'translateY(-100%)' },
          '50%': { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(-100%)' },
        },
        terminalBlink: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' },
        },
        pulseDot: {
          '0%, 100%': { opacity: '0.4', transform: 'scale(1)' },
          '50%': { opacity: '1', transform: 'scale(1.5)' },
        },
        typing: {
          '0%': { width: '0' },
          '100%': { width: '100%' },
        },
        radarSweep: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        glowPulse: {
          '0%, 100%': { opacity: '0.4' },
          '50%': { opacity: '0.8' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        counter: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      backgroundImage: {
        'grid-subtle': 'linear-gradient(rgba(0,229,160,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,229,160,0.03) 1px, transparent 1px)',
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
      },
      backgroundSize: {
        'grid-40': '40px 40px',
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
