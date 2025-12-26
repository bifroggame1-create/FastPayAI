'use client'

import Link from 'next/link'
import { useAppStore } from '@/lib/store'

interface HeaderProps {
  title?: string
  logo?: string
  showBack?: boolean
  onBack?: () => void
  rightAction?: React.ReactNode
  showNavButtons?: boolean
}

export default function Header({ title, logo, showBack, onBack, rightAction, showNavButtons = true }: HeaderProps) {
  const { unreadChats } = useAppStore()

  return (
    <header className="sticky top-0 z-50 bg-light-card dark:bg-dark-bg border-b border-light-border dark:border-dark-border px-4 py-3">
      <div className="flex items-center justify-between relative">
        {/* Left side - Back button or Nav buttons */}
        <div className="flex items-center gap-2">
          {showBack ? (
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-light-text-secondary dark:text-dark-text-secondary hover:text-light-text dark:hover:text-dark-text"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          ) : showNavButtons ? (
            <>
              <Link
                href="/support"
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-light-bg dark:bg-dark-card border border-light-border dark:border-dark-border text-sm text-light-text dark:text-dark-text hover:border-accent-cyan transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                <span className="hidden sm:inline">Поддержка</span>
              </Link>
              <Link
                href="/chats"
                className="relative flex items-center gap-1 px-3 py-1.5 rounded-lg bg-light-bg dark:bg-dark-card border border-light-border dark:border-dark-border text-sm text-light-text dark:text-dark-text hover:border-accent-cyan transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <span className="hidden sm:inline">Чаты</span>
                {unreadChats > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {unreadChats > 9 ? '9+' : unreadChats}
                  </span>
                )}
              </Link>
            </>
          ) : (
            <div className="w-20" />
          )}
        </div>

        {/* Center - Logo or Title */}
        <div className="flex-1 flex items-center justify-center">
          {logo && (
            <img
              src={logo}
              alt="FastPay"
              className="h-12 w-auto object-contain [mix-blend-mode:multiply] dark:[mix-blend-mode:screen]"
            />
          )}
          {title && !logo && (
            <h1 className="text-xl font-semibold text-light-text dark:text-dark-text">{title}</h1>
          )}
        </div>

        {/* Right side - Actions */}
        <div className="w-20 flex justify-end">
          {rightAction}
        </div>
      </div>
    </header>
  )
}
