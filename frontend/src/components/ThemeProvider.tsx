'use client'

import { useEffect, useLayoutEffect, useState } from 'react'
import { useAppStore } from '@/lib/store'

// Use useLayoutEffect on client, useEffect on server
const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect

// Theme CSS variables — must override Telegram SDK inline styles
const LIGHT_VARS: Record<string, string> = {
  '--tg-theme-bg-color': '#ffffff',
  '--tg-theme-secondary-bg-color': '#f1f1f1',
  '--tg-theme-text-color': '#000000',
  '--tg-theme-hint-color': '#999999',
  '--tg-theme-link-color': '#2481cc',
  '--tg-theme-button-color': '#2481cc',
  '--tg-theme-button-text-color': '#ffffff',
  '--tg-theme-header-bg-color': '#ffffff',
  '--tg-theme-accent-text-color': '#2481cc',
  '--tg-theme-section-bg-color': '#ffffff',
  '--tg-theme-section-header-text-color': '#6d6d72',
  '--tg-theme-subtitle-text-color': '#999999',
  '--tg-theme-destructive-text-color': '#ff3b30',
  '--tg-theme-section-separator-color': '#c8c7cc',
}

const DARK_VARS: Record<string, string> = {
  '--tg-theme-bg-color': '#17212b',
  '--tg-theme-secondary-bg-color': '#232e3c',
  '--tg-theme-text-color': '#f5f5f5',
  '--tg-theme-hint-color': '#708499',
  '--tg-theme-link-color': '#6ab3f3',
  '--tg-theme-button-color': '#5288c1',
  '--tg-theme-button-text-color': '#ffffff',
  '--tg-theme-header-bg-color': '#17212b',
  '--tg-theme-accent-text-color': '#6ab2f2',
  '--tg-theme-section-bg-color': '#17212b',
  '--tg-theme-section-header-text-color': '#6ab3f3',
  '--tg-theme-subtitle-text-color': '#708499',
  '--tg-theme-destructive-text-color': '#ec3942',
  '--tg-theme-section-separator-color': '#293a4c',
}

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { theme } = useAppStore()
  const [mounted, setMounted] = useState(false)

  // Mark as mounted after hydration
  useEffect(() => {
    setMounted(true)
  }, [])

  // Apply theme immediately when it changes (after mount)
  useIsomorphicLayoutEffect(() => {
    if (!mounted) return

    const html = document.documentElement

    // Remove both classes first
    html.classList.remove('dark', 'light')

    // Add the correct class
    html.classList.add(theme)

    // Override Telegram SDK inline styles by setting CSS vars directly on style
    // Inside TMA, Telegram injects --tg-theme-* as inline styles which beat class-based CSS
    const vars = theme === 'dark' ? DARK_VARS : LIGHT_VARS
    for (const [key, value] of Object.entries(vars)) {
      html.style.setProperty(key, value)
    }

    // Update Telegram WebApp header/bg colors if available
    try {
      const webApp = window.Telegram?.WebApp
      if (webApp) {
        const bgColor = theme === 'dark' ? '#17212b' : '#ffffff'
        const headerColor = theme === 'dark' ? '#17212b' : '#ffffff'
        webApp.setHeaderColor?.(headerColor)
        webApp.setBackgroundColor?.(bgColor)
      }
    } catch {
      // Not inside TMA
    }

    // Update meta theme-color
    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta) {
      meta.setAttribute('content', theme === 'dark' ? '#17212b' : '#ffffff')
    }

    // Store in localStorage for pre-hydration script
    const stored = localStorage.getItem('fastpay-storage')
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        if (parsed.state) {
          parsed.state.theme = theme
          localStorage.setItem('fastpay-storage', JSON.stringify(parsed))
        }
      } catch (e) {
        // Ignore
      }
    }
  }, [theme, mounted])

  return <>{children}</>
}
