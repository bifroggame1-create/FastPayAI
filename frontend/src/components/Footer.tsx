'use client'

import Link from 'next/link'
import { useAppStore } from '@/lib/store'

export default function Footer() {
  const { language } = useAppStore()

  const currentYear = new Date().getFullYear()

  return (
    <footer className="bg-light-card dark:bg-dark-card border-t border-light-border dark:border-dark-border mt-auto">
      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* Legal Links */}
        <div className="grid grid-cols-2 gap-2 mb-4 text-xs">
          <Link
            href="/legal/offer"
            className="text-light-text-secondary dark:text-dark-text-secondary hover:text-accent-cyan transition-colors"
          >
            {language === 'ru' ? 'Публичная оферта' : 'Terms of Service'}
          </Link>
          <Link
            href="/legal/privacy"
            className="text-light-text-secondary dark:text-dark-text-secondary hover:text-accent-cyan transition-colors"
          >
            {language === 'ru' ? 'Конфиденциальность' : 'Privacy Policy'}
          </Link>
          <Link
            href="/legal/refund"
            className="text-light-text-secondary dark:text-dark-text-secondary hover:text-accent-cyan transition-colors"
          >
            {language === 'ru' ? 'Возврат и отмена' : 'Refund Policy'}
          </Link>
          <Link
            href="/legal/delivery"
            className="text-light-text-secondary dark:text-dark-text-secondary hover:text-accent-cyan transition-colors"
          >
            {language === 'ru' ? 'Условия доставки' : 'Delivery Terms'}
          </Link>
        </div>

        {/* Divider */}
        <div className="border-t border-light-border dark:border-dark-border my-4"></div>

        {/* Bottom Row */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-light-text-secondary dark:text-dark-text-secondary">
          <div className="flex items-center gap-1">
            <span>&copy; {currentYear} FastPay</span>
            <span className="hidden sm:inline">—</span>
            <span className="hidden sm:inline">{language === 'ru' ? 'Цифровые товары' : 'Digital Goods'}</span>
          </div>

          <Link
            href="/legal/contacts"
            className="flex items-center gap-1 hover:text-accent-cyan transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <span>{language === 'ru' ? 'Поддержка' : 'Support'}</span>
          </Link>
        </div>
      </div>
    </footer>
  )
}
