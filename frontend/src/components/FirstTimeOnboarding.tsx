'use client'

import { useState, useEffect } from 'react'
import { useAppStore } from '@/lib/store'
import { GoldDiamond, LightningFast, ShieldCheck } from './Icons'

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
  key: <GoldDiamond className="w-7 h-7" />,
  lightning: <LightningFast className="w-7 h-7" />,
  shield: <ShieldCheck className="w-7 h-7" />
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
      <div className="relative bg-tg-secondary-bg w-full max-w-sm mx-4 rounded-2xl overflow-hidden animate-slide-up" role="dialog" aria-modal="true" aria-labelledby="onboarding-title">
        {/* Header with gradient */}
        <div className="bg-gradient-to-r from-tg-button to-tg-accent p-6 text-center text-white">
          <div className="w-16 h-16 mx-auto mb-4 bg-white/20 rounded-2xl flex items-center justify-center" aria-hidden="true">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h2 id="onboarding-title" className="text-xl font-bold mb-1">{t.title}</h2>
          <p className="text-white/80 text-sm">{t.subtitle}</p>
        </div>

        {/* Features */}
        <div className="p-5 space-y-3">
          {t.features.map((feature, i) => (
            <div key={i} className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-tg-button/20 to-tg-accent/20 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm" aria-hidden="true">
                {icons[feature.icon as keyof typeof icons]}
              </div>
              <span className="text-tg-text font-medium">
                {feature.text}
              </span>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="p-5 pt-0">
          <button
            onClick={handleDismiss}
            className="w-full py-3.5 bg-tg-button text-white font-bold rounded-xl transition-all active:scale-[0.98]"
          >
            {t.cta}
          </button>
        </div>
      </div>
    </div>
  )
}
