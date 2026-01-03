'use client'

import { useAppStore } from '@/lib/store'
import { useEffect } from 'react'
import { t } from '@/lib/i18n'

interface LanguageCurrencyModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function LanguageCurrencyModal({ isOpen, onClose }: LanguageCurrencyModalProps) {
  const { language, currency, setLanguage, setCurrency } = useAppStore()

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  if (!isOpen) return null

  const languages = [
    { code: 'ru' as const, name: 'Русский', flag: '🇷🇺' },
    { code: 'en' as const, name: 'English', flag: '🇺🇸' }
  ]

  const currencies = [
    { code: 'RUB' as const, name: 'Российский рубль', symbol: '₽' },
    { code: 'USD' as const, name: 'US Dollar', symbol: '$' },
    { code: 'EUR' as const, name: 'Euro', symbol: '€' }
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-tg-secondary-bg rounded-2xl max-w-md w-full mx-4 max-h-[80vh] overflow-y-auto border border-tg-separator">
        {/* Header */}
        <div className="sticky top-0 bg-tg-secondary-bg border-b border-tg-separator px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-tg-text">{t('settingsTitle', language)}</h2>
          <button
            onClick={onClose}
            className="text-tg-hint hover:text-tg-text"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Language Section */}
          <div>
            <h3 className="text-sm font-medium text-tg-hint mb-3">
              {t('language', language)}
            </h3>
            <div className="space-y-2">
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => setLanguage(lang.code)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg border transition-colors ${
                    language === lang.code
                      ? 'border-tg-button bg-tg-button/10 text-tg-text'
                      : 'border-tg-separator text-tg-hint hover:border-tg-button/50'
                  }`}
                >
                  <span className="text-2xl">{lang.flag}</span>
                  <span className="flex-1 text-left font-medium">{lang.name}</span>
                  {language === lang.code && (
                    <svg className="w-5 h-5 text-tg-button" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Currency Section */}
          <div>
            <h3 className="text-sm font-medium text-tg-hint mb-3">
              {t('currency', language)}
            </h3>
            <div className="space-y-2">
              {currencies.map((curr) => (
                <button
                  key={curr.code}
                  onClick={() => setCurrency(curr.code)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg border transition-colors ${
                    currency === curr.code
                      ? 'border-tg-button bg-tg-button/10 text-tg-text'
                      : 'border-tg-separator text-tg-hint hover:border-tg-button/50'
                  }`}
                >
                  <span className="text-2xl">{curr.symbol}</span>
                  <span className="flex-1 text-left font-medium">{curr.name}</span>
                  <span className="text-sm text-tg-hint">{curr.code}</span>
                  {currency === curr.code && (
                    <svg className="w-5 h-5 text-tg-button" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
