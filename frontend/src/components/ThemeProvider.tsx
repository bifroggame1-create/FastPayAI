'use client'

import { useEffect, useLayoutEffect } from 'react'
import { useAppStore } from '@/lib/store'

// Use useLayoutEffect on client, useEffect on server
const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { theme } = useAppStore()

  // Apply theme immediately on change
  useIsomorphicLayoutEffect(() => {
    const html = document.documentElement

    if (theme === 'dark') {
      html.classList.add('dark')
      html.classList.remove('light')
    } else {
      html.classList.add('light')
      html.classList.remove('dark')
    }

    // Also update meta theme-color for mobile browsers
    const metaThemeColor = document.querySelector('meta[name="theme-color"]')
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', theme === 'dark' ? '#17212b' : '#ffffff')
    }
  }, [theme])

  // Initialize on mount - sync from zustand persisted state
  useEffect(() => {
    // Force a re-render after hydration to get persisted theme
    const persistedState = localStorage.getItem('fastpay-storage')
    if (persistedState) {
      try {
        const parsed = JSON.parse(persistedState)
        const savedTheme = parsed?.state?.theme || 'dark'
        const html = document.documentElement

        if (savedTheme === 'dark') {
          html.classList.add('dark')
          html.classList.remove('light')
        } else {
          html.classList.add('light')
          html.classList.remove('dark')
        }
      } catch (e) {
        // Default to dark
        document.documentElement.classList.add('dark')
      }
    }
  }, [])

  return <>{children}</>
}
