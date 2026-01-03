import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Telegram Mini Apps Theme Colors
        'tg-bg': 'var(--tg-theme-bg-color)',
        'tg-secondary-bg': 'var(--tg-theme-secondary-bg-color)',
        'tg-text': 'var(--tg-theme-text-color)',
        'tg-hint': 'var(--tg-theme-hint-color)',
        'tg-link': 'var(--tg-theme-link-color)',
        'tg-button': 'var(--tg-theme-button-color)',
        'tg-button-text': 'var(--tg-theme-button-text-color)',
        'tg-accent': 'var(--tg-theme-accent-text-color)',
        'tg-destructive': 'var(--tg-theme-destructive-text-color)',
        'tg-section-header': 'var(--tg-theme-section-header-text-color)',
        'tg-separator': 'var(--tg-theme-section-separator-color)',

        // App semantic colors
        'app-bg': 'var(--app-bg)',
        'app-card': 'var(--app-card)',
        'app-text': 'var(--app-text)',
        'app-text-secondary': 'var(--app-text-secondary)',
        'app-accent': 'var(--app-accent)',
        'app-button': 'var(--app-button)',
        'app-border': 'var(--app-border)',
        'app-destructive': 'var(--app-destructive)',
        'app-success': 'var(--app-success)',

        // Legacy support
        'dark-bg': '#17212b',
        'dark-card': '#232e3c',
        'dark-border': '#293a4c',
        'dark-text': '#f5f5f5',
        'dark-text-secondary': '#708499',
        'light-bg': '#ffffff',
        'light-card': '#f5f5f5',
        'light-border': '#e5e5e5',
        'light-text': '#1a1a1a',
        'light-text-secondary': '#6b7280',
        'accent-blue': '#5288c1',
        'accent-cyan': '#6ab3f3',
      },
      borderRadius: {
        'tg': '12px',
        'tg-sm': '10px',
        'tg-lg': '16px',
      },
      animation: {
        'wiggle': 'wiggle 1s ease-in-out infinite',
        'float': 'float 3s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite',
        'pulse-subtle': 'pulse-subtle 2s ease-in-out infinite',
        'slide-up': 'slide-up 0.3s ease-out',
        'fade-in': 'fade-in 0.2s ease-out',
      },
      keyframes: {
        wiggle: {
          '0%, 100%': { transform: 'rotate(-3deg)' },
          '50%': { transform: 'rotate(3deg)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5px)' },
        },
        glow: {
          '0%, 100%': { filter: 'brightness(1)' },
          '50%': { filter: 'brightness(1.2)' },
        },
        'pulse-subtle': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
export default config
