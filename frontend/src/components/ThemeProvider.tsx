'use client'

import { useEffect, useLayoutEffect, useState } from 'react'
import { useAppStore } from '@/lib/store'

// Use useLayoutEffect on client, useEffect on server
const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect

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
