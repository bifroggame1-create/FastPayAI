'use client'

import { useState } from 'react'
import { promoApi } from '@/lib/api'

interface PromoCodeInputProps {
  orderAmount: number
  onPromoApplied: (discount: number, code: string) => void
}

export default function PromoCodeInput({ orderAmount, onPromoApplied }: PromoCodeInputProps) {
  const [promoCode, setPromoCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [appliedPromo, setAppliedPromo] = useState<string | null>(null)

  const handleApplyPromo = async () => {
    if (!promoCode.trim()) {
      setMessage({ type: 'error', text: 'Введите промокод' })
      return
    }

    setLoading(true)
    setMessage(null)

    try {
      const result = await promoApi.validate(promoCode, orderAmount)

      if (result.valid) {
        setMessage({ type: 'success', text: `Промокод применён! Скидка ${result.discount}₽` })
        setAppliedPromo(promoCode)
        onPromoApplied(result.discount, promoCode)
      } else {
        setMessage({ type: 'error', text: result.message })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Ошибка проверки промокода' })
    } finally {
      setLoading(false)
    }
  }

  const handleRemovePromo = () => {
    setPromoCode('')
    setAppliedPromo(null)
    setMessage(null)
    onPromoApplied(0, '')
  }

  return (
    <div className="bg-light-card dark:bg-dark-card rounded-2xl p-4 border border-light-border dark:border-dark-border">
      <div className="flex items-center gap-2 mb-3">
        <svg className="w-5 h-5 text-accent-cyan" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
        </svg>
        <h3 className="text-base font-semibold text-light-text dark:text-dark-text">Промокод</h3>
      </div>

      {!appliedPromo ? (
        <>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={promoCode}
              onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
              placeholder="Введите промокод"
              className="flex-1 px-4 py-2 rounded-lg bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border text-light-text dark:text-dark-text focus:outline-none focus:border-accent-cyan"
              disabled={loading}
            />
            <button
              onClick={handleApplyPromo}
              disabled={loading}
              className="px-6 py-2 bg-accent-cyan text-white rounded-lg font-medium hover:bg-accent-blue transition-colors disabled:opacity-50"
            >
              {loading ? 'Проверка...' : 'Применить'}
            </button>
          </div>

          {message && (
            <div className={`text-sm px-3 py-2 rounded-lg ${message.type === 'success' ? 'bg-green-500/10 text-green-600 dark:text-green-400' : 'bg-red-500/10 text-red-600 dark:text-red-400'}`}>
              {message.text}
            </div>
          )}
        </>
      ) : (
        <div className="flex items-center justify-between bg-green-500/10 dark:bg-green-500/20 rounded-lg px-4 py-3">
          <div>
            <p className="font-mono font-bold text-green-600 dark:text-green-400">{appliedPromo}</p>
            <p className="text-sm text-green-600/80 dark:text-green-400/80">{message?.text}</p>
          </div>
          <button
            onClick={handleRemovePromo}
            className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      <div className="mt-3 p-3 bg-accent-blue/10 dark:bg-accent-blue/20 rounded-lg">
        <p className="text-xs text-light-text dark:text-dark-text">
          🎁 Доступные промокоды: <span className="font-bold">WELCOME10</span>, <span className="font-bold">FASTPAY20</span>, <span className="font-bold">NEWYEAR2025</span>
        </p>
      </div>
    </div>
  )
}
