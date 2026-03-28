/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Geist', 'system-ui', 'sans-serif'],
        display: ['Geist', 'system-ui', 'sans-serif'],
        mono: ['Geist Mono', 'ui-monospace', 'monospace'],
      },
      colors: {
        brand: { 50:'#eef5ff',100:'#d9e9ff',200:'#bcd6ff',300:'#8ebaff',400:'#5993ff',500:'#3370ff',600:'#1a4ef5',700:'#133ae2',800:'#1630b7',900:'#172e90',950:'#111f5c' },
        success: { 50:'#f0fdf4',100:'#dcfce7',400:'#4ade80',500:'#22c55e',600:'#16a34a',700:'#15803d' },
        warn: { 50:'#fffbeb',100:'#fef3c7',400:'#fbbf24',500:'#f59e0b',600:'#d97706',700:'#b45309' },
        danger: { 50:'#fef2f2',100:'#fee2e2',400:'#f87171',500:'#ef4444',600:'#dc2626',700:'#b91c1c' },
        slate: { 925:'#0d1117',950:'#090d14' }
      },
      boxShadow: {
        card: '0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.04)',
        elevated: '0 4px 16px -2px rgb(0 0 0 / 0.1), 0 2px 6px -2px rgb(0 0 0 / 0.06)',
        modal: '0 20px 60px -10px rgb(0 0 0 / 0.25)',
        glow: '0 0 20px rgb(51 112 255 / 0.25)',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'scale-in': 'scaleIn 0.18s ease-out',
        'slide-up': 'slideUp 0.22s ease-out',
        shimmer: 'shimmer 1.6s infinite',
      },
      keyframes: {
        fadeIn: { from:{ opacity:0 }, to:{ opacity:1 } },
        scaleIn: { from:{ opacity:0, transform:'scale(0.96)' }, to:{ opacity:1, transform:'scale(1)' } },
        slideUp: { from:{ opacity:0, transform:'translateY(8px)' }, to:{ opacity:1, transform:'translateY(0)' } },
        shimmer: { '0%':{ backgroundPosition:'-200% 0' }, '100%':{ backgroundPosition:'200% 0' } },
      },
    },
  },
  plugins: [],
}
