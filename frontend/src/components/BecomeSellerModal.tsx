'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAppStore } from '@/lib/store'

interface BecomeSellerModalProps {
  isOpen: boolean
  onClose: () => void
}

const content = {
  ru: {
    title: 'Стать продавцом',
    subtitle: 'Зарабатывайте на продаже цифровых товаров',
    benefits: [
      { icon: '💰', text: 'Комиссия всего 5% с продаж' },
      { icon: '🛡️', text: 'Защита через escrow-систему' },
      { icon: '🚀', text: 'Автоматическая доставка товаров' },
      { icon: '📊', text: 'Детальная статистика продаж' },
      { icon: '⭐', text: 'Система рейтинга и бейджей' },
      { icon: '💬', text: 'Встроенный чат с покупателями' },
    ],
    requirements: {
      title: 'Требования',
      items: [
        'Верифицированный аккаунт Telegram',
        'Согласие с правилами площадки',
        'Цифровые товары для продажи',
      ]
    },
    cta: 'Подать заявку',
    learnMore: 'Подробнее о правилах',
    close: 'Закрыть',
  },
  en: {
    title: 'Become a Seller',
    subtitle: 'Earn money selling digital products',
    benefits: [
      { icon: '💰', text: 'Only 5% commission on sales' },
      { icon: '🛡️', text: 'Protection via escrow system' },
      { icon: '🚀', text: 'Automatic product delivery' },
      { icon: '📊', text: 'Detailed sales statistics' },
      { icon: '⭐', text: 'Rating and badge system' },
      { icon: '💬', text: 'Built-in buyer chat' },
    ],
    requirements: {
      title: 'Requirements',
      items: [
        'Verified Telegram account',
        'Agreement with platform rules',
        'Digital products to sell',
      ]
    },
    cta: 'Apply Now',
    learnMore: 'Learn more about rules',
    close: 'Close',
  }
}

export default function BecomeSellerModal({ isOpen, onClose }: BecomeSellerModalProps) {
  const router = useRouter()
  const { language } = useAppStore()
  const t = content[language]

  if (!isOpen) return null

  const handleApply = () => {
    onClose()
    router.push('/become-seller')
  }

  const handleLearnMore = () => {
    onClose()
    router.push('/seller-rules')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        className="relative bg-tg-secondary-bg w-full max-w-md max-h-[90vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl animate-slide-up"
        role="dialog"
        aria-modal="true"
        aria-labelledby="seller-modal-title"
      >
        {/* Header */}
        <div className="sticky top-0 bg-tg-secondary-bg p-4 border-b border-tg-separator flex items-center justify-between">
          <h2 id="seller-modal-title" className="text-xl font-bold text-tg-text">{t.title}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-tg-bg rounded-full transition-colors"
            aria-label={t.close}
          >
            <svg className="w-5 h-5 text-tg-hint" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-5">
          {/* Hero Section */}
          <div className="text-center mb-6">
            <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-tg-button to-tg-accent rounded-2xl flex items-center justify-center" aria-hidden="true">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <p className="text-tg-hint">
              {t.subtitle}
            </p>
          </div>

          {/* Benefits */}
          <div className="space-y-3 mb-6">
            {t.benefits.map((benefit, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-3 bg-tg-bg rounded-xl"
              >
                <span className="text-2xl" aria-hidden="true">{benefit.icon}</span>
                <span className="text-tg-text font-medium">
                  {benefit.text}
                </span>
              </div>
            ))}
          </div>

          {/* Requirements */}
          <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4 mb-6">
            <h3 className="font-semibold text-amber-800 dark:text-amber-400 mb-2 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {t.requirements.title}
            </h3>
            <ul className="space-y-1.5">
              {t.requirements.items.map((item, index) => (
                <li key={index} className="text-sm text-amber-700 dark:text-amber-300 flex items-start gap-2">
                  <span className="mt-1" aria-hidden="true">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* CTA Buttons */}
          <div className="space-y-3">
            <button
              onClick={handleApply}
              className="w-full py-4 bg-gradient-to-r from-tg-button to-tg-accent text-white font-bold rounded-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              {t.cta}
            </button>

            <button
              onClick={handleLearnMore}
              className="w-full py-3 bg-tg-bg text-tg-text font-medium rounded-xl border border-tg-separator transition-all active:scale-[0.98]"
            >
              {t.learnMore}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
