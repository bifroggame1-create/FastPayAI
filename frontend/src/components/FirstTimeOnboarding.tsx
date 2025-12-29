'use client'

import { useState, useEffect } from 'react'
import { useAppStore } from '@/lib/store'

const ONBOARDING_KEY = 'fastpay_onboarding_seen'

const content = {
  ru: {
    title: 'Добро пожаловать в FastPay',
    subtitle: 'Здесь можно купить цифровые товары безопасно',
    features: [
      { icon: 'key', text: 'Ключи, подписки, аккаунты' },
      { icon: 'lightning', text: 'Моментальная доставка в чат' },
      { icon: 'shield', text: 'Возврат денег если что-то не так' }
    ],
    cta: 'Понятно'
  },
  en: {
    title: 'Welcome to FastPay',
    subtitle: 'Buy digital goods safely here',
    features: [
      { icon: 'key', text: 'Keys, subscriptions, accounts' },
      { icon: 'lightning', text: 'Instant delivery to chat' },
      { icon: 'shield', text: 'Money back if something is wrong' }
    ],
    cta: 'Got it'
  }
}

const icons = {
  key: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
    </svg>
  ),
  lightning: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  ),
  shield: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  )
}

export default function FirstTimeOnboarding() {
  const [show, setShow] = useState(false)
  const { language } = useAppStore()
  const t = content[language]

  useEffect(() => {
    // Check if user has seen onboarding
    const seen = localStorage.getItem(ONBOARDING_KEY)
    if (!seen) {
      // Small delay to let page load first
      const timer = setTimeout(() => setShow(true), 500)
      return () => clearTimeout(timer)
    }
  }, [])

  const handleDismiss = () => {
    localStorage.setItem(ONBOARDING_KEY, 'true')
    setShow(false)
  }

  if (!show) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleDismiss}
      />

      {/* Modal */}
      <div className="relative bg-light-card dark:bg-dark-card w-full max-w-sm mx-4 rounded-2xl overflow-hidden animate-slide-up">
        {/* Header with gradient */}
        <div className="bg-gradient-to-r from-accent-cyan to-accent-blue p-6 text-center text-white">
          <div className="w-16 h-16 mx-auto mb-4 bg-white/20 rounded-2xl flex items-center justify-center">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold mb-1">{t.title}</h2>
          <p className="text-white/80 text-sm">{t.subtitle}</p>
        </div>

        {/* Features */}
        <div className="p-5 space-y-3">
          {t.features.map((feature, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-10 h-10 bg-accent-cyan/10 dark:bg-accent-cyan/20 rounded-xl flex items-center justify-center text-accent-cyan flex-shrink-0">
                {icons[feature.icon as keyof typeof icons]}
              </div>
              <span className="text-light-text dark:text-dark-text font-medium">
                {feature.text}
              </span>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="p-5 pt-0">
          <button
            onClick={handleDismiss}
            className="w-full py-3.5 bg-accent-cyan text-white font-bold rounded-xl transition-all active:scale-[0.98]"
          >
            {t.cta}
          </button>
        </div>
      </div>
    </div>
  )
}
