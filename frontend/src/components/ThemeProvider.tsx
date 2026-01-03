'use client'

import { useEffect } from 'react'
import { useAppStore } from '@/lib/store'

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { theme } = useAppStore()

  // Apply theme whenever it changes
  useEffect(() => {
    const html = document.documentElement

    if (theme === 'light') {
      html.classList.remove('dark')
      html.classList.add('light')
    } else {
      html.classList.remove('light')
      html.classList.add('dark')
    }

    // Update meta theme-color
    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta) {
      meta.setAttribute('content', theme === 'dark' ? '#17212b' : '#ffffff')
    }
  }, [theme])

  return <>{children}</>
}
