/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Emerald Accent — Moonlight Theme
        accent: {
          DEFAULT: '#059669',
          hover: '#047857',
          light: '#10b981',
          lighter: '#34d399',
          subtle: 'rgba(5, 150, 105, 0.08)',
          glow: 'rgba(5, 150, 105, 0.18)',
        },
        // Sidebar Dark Forest
        sb: {
          bg: '#0b1a10',
          surface: '#122018',
          border: 'rgba(16, 185, 129, 0.07)',
          text: '#e8f5ee',
          muted: '#507a62',
          hover: 'rgba(255, 255, 255, 0.04)',
          active: 'rgba(16, 185, 129, 0.1)',
        },
        // Content Light
        canvas: '#f2f8f5',
        surface: '#ffffff',
        subtle: '#f8fdfb',
        muted: '#eef7f2',
        // Semantic
        success: '#22c55e',
        danger: '#ef4444',
        warning: '#f59e0b',
        info: '#0ea5e9',
        // Text
        primary: '#0a1c12',
        secondary: '#3a6150',
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      borderRadius: {
        xl: '24px',
        lg: '16px',
        md: '12px',
        sm: '8px',
        xs: '4px',
      },
      boxShadow: {
        xs:    '0 1px 2px rgba(0,0,0,0.04)',
        sm:    '0 2px 6px -1px rgba(0,0,0,0.07), 0 1px 3px -1px rgba(0,0,0,0.05)',
        md:    '0 8px 16px -4px rgba(0,0,0,0.08), 0 3px 6px -2px rgba(0,0,0,0.04)',
        lg:    '0 20px 40px -10px rgba(0,0,0,0.1), 0 8px 16px -6px rgba(0,0,0,0.06)',
        xl:    '0 40px 80px -20px rgba(0,0,0,0.14), 0 16px 32px -8px rgba(0,0,0,0.08)',
        green: '0 6px 20px rgba(5, 150, 105, 0.22)',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        'card-enter': {
          from: { opacity: '0', transform: 'translateY(24px) scale(0.96)' },
          to:   { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        'orb-float': {
          '0%':   { transform: 'translate(0, 0) scale(1)' },
          '100%': { transform: 'translate(-30px, -20px) scale(1.05)' },
        },
        'pulse-dot': {
          '0%, 100%': { boxShadow: '0 0 0 2px rgba(34,197,94,0.2)' },
          '50%':      { boxShadow: '0 0 0 5px rgba(34,197,94,0)' },
        },
        'spin': {
          from: { transform: 'rotate(0deg)' },
          to:   { transform: 'rotate(360deg)' },
        },
      },
      animation: {
        'fade-in':   'fade-in 0.3s cubic-bezier(0.16,1,0.3,1) forwards',
        'card-enter': 'card-enter 0.7s cubic-bezier(0.16,1,0.3,1) forwards',
        'orb-float': 'orb-float 10s ease-in-out infinite alternate',
        'pulse-dot': 'pulse-dot 2s ease-in-out infinite',
        'spin-slow': 'spin 0.8s linear infinite',
      },
    },
  },
  plugins: [],
}
