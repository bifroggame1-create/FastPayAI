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
        // Dark Blue theme colors - sophisticated and modern
        'dark-bg': '#0a1929',        // Very dark blue background
        'dark-card': '#1e293b',      // Dark blue card
        'dark-border': '#334155',    // Blue-gray border
        'dark-text': '#f1f5f9',      // Soft white with blue tint
        'dark-text-secondary': '#94a3b8', // Blue-gray secondary text

        // Light theme colors
        'light-bg': '#f5f5f5',
        'light-card': '#ffffff',
        'light-border': '#e5e5e5',
        'light-text': '#1a1a1a',
        'light-text-secondary': '#6b7280',

        // Accent colors (work in both themes) - enhanced for dark blue theme
        'accent-blue': '#3b82f6',    // Vibrant blue
        'accent-cyan': '#06b6d4',    // Cyan accent
      },
    },
  },
  plugins: [],
}
export default config
