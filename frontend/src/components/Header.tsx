'use client'

import Link from 'next/link'
import { useAppStore } from '@/lib/store'
import { useState } from 'react'
import LanguageCurrencyModal from './LanguageCurrencyModal'
import { t } from '@/lib/i18n'

interface HeaderProps {
  title?: string
  showBack?: boolean
  onBack?: () => void
  rightAction?: React.ReactNode
  showNavButtons?: boolean
}

export default function Header({ title, showBack, onBack, rightAction, showNavButtons = true }: HeaderProps) {
  const { unreadChats, language, currency } = useAppStore()
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 bg-tg-bg border-b border-tg-separator">
      <div className="flex items-center justify-between px-4 h-14">
        {/* Left side */}
        <div className="flex items-center gap-3 min-w-0">
          {showBack ? (
            <button
              onClick={onBack}
              className="flex items-center justify-center w-8 h-8 -ml-2 text-tg-accent active:opacity-70"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          ) : (
            <img
              src="/logofast.png"
              alt="FastPay"
              className="h-8 w-auto object-contain"
            />
          )}
          {title && (
            <h1 className="text-[17px] font-semibold text-tg-text truncate">{title}</h1>
          )}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-1">
          {showNavButtons && (
            <>
              <Link
                href="/support"
                className="flex items-center justify-center w-10 h-10 text-tg-hint active:opacity-70"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </Link>
              <Link
                href="/chats"
                className="relative flex items-center justify-center w-10 h-10 text-tg-hint active:opacity-70"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                {unreadChats > 0 && (
                  <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 bg-tg-destructive text-white text-[10px] font-medium rounded-full flex items-center justify-center">
                    {unreadChats > 9 ? '9+' : unreadChats}
                  </span>
                )}
              </Link>
              <button
                onClick={() => setIsSettingsOpen(true)}
                className="flex items-center gap-1 px-2 h-8 rounded-lg bg-tg-secondary-bg text-tg-text text-[13px] font-medium active:opacity-70"
              >
                <span>{language === 'ru' ? '🇷🇺' : '🇺🇸'}</span>
                <span>{currency === 'RUB' ? '₽' : currency === 'USD' ? '$' : '€'}</span>
              </button>
            </>
          )}
          {rightAction}
        </div>
      </div>

      <LanguageCurrencyModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </header>
  )
}
