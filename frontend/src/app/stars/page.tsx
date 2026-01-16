'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header'
import { useAppStore } from '@/lib/store'
import { hapticImpact } from '@/lib/telegram'
import { formatPrice } from '@/lib/currency'
import dynamic from 'next/dynamic'

// Dynamically import Lottie to avoid SSR issues
const Lottie = dynamic(() => import('lottie-react'), { ssr: false })

// Import duck animations
import duckHeroAnimation from '../../../public/duck-stickers/duck-10.json'
import duckSuccessAnimation from '../../../public/duck-stickers/duck-5.json'

interface StarPackage {
  id: string
  amount: number
  price: number
  popular?: boolean
  bonus?: number
}

const starPackages: StarPackage[] = [
  { id: '50', amount: 50, price: 90 },
  { id: '100', amount: 100, price: 180, popular: true },
  { id: '500', amount: 500, price: 900, bonus: 50 },
  { id: '1000', amount: 1000, price: 1800, bonus: 150 },
  { id: '2500', amount: 2500, price: 4500, bonus: 500 }
]

export default function StarsPage() {
  const router = useRouter()
  const { user, language } = useAppStore()
  const [selectedPackage, setSelectedPackage] = useState<StarPackage>(starPackages[1])
  const [username, setUsername] = useState(user?.username || '')
  const [processing, setProcessing] = useState(false)

  const handlePackageSelect = (pkg: StarPackage) => {
    setSelectedPackage(pkg)
    hapticImpact('light')
  }

  const handlePurchase = async () => {
    if (!username.trim()) {
      alert(language === 'ru' ? 'Введите Telegram username' : 'Enter Telegram username')
      return
    }

    setProcessing(true)
    hapticImpact('medium')

    try {
      // TODO: API integration with Fragment + Telegram Bot Payments
      const response = await fetch('/api/stars/create-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.startsWith('@') ? username : `@${username}`,
          stars: selectedPackage.amount,
          price: selectedPackage.price,
          userId: user?.id
        })
      })

      const data = await response.json()

      if (data.success && data.invoiceUrl) {
        // Open Telegram payment
        if (window.Telegram?.WebApp?.openInvoice) {
          window.Telegram.WebApp.openInvoice(data.invoiceUrl, (status) => {
            if (status === 'paid') {
              alert(language === 'ru'
                ? `${selectedPackage.amount} ⭐ Stars доставлены!`
                : `${selectedPackage.amount} ⭐ Stars delivered!`)
              router.push('/')
            }
          })
        } else {
          window.open(data.invoiceUrl, '_blank')
        }
      } else {
        alert(language === 'ru' ? 'Ошибка создания платежа' : 'Payment creation error')
      }
    } catch (error) {
      console.error('Stars purchase error:', error)
      alert(language === 'ru' ? 'Произошла ошибка' : 'An error occurred')
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="min-h-screen bg-tg-bg pb-24">
      <Header
        title={language === 'ru' ? 'Купить Telegram Stars' : 'Buy Telegram Stars'}
        showBack
        onBack={() => router.back()}
      />

      <div className="px-4 py-6 space-y-6">
        {/* Hero Section */}
        <div className="bg-gradient-to-r from-purple-500 to-blue-500 rounded-2xl p-6 text-white relative overflow-hidden">
          <div className="relative z-10 flex items-start gap-4">
            <div className="w-24 h-24 flex-shrink-0">
              <Lottie
                animationData={duckHeroAnimation}
                loop={true}
                style={{ width: '100%', height: '100%' }}
              />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold mb-2">
                {language === 'ru' ? 'Telegram Stars' : 'Telegram Stars'}
              </h1>
              <p className="text-white/90 text-sm">
                {language === 'ru'
                  ? 'Мгновенная доставка • Безопасная оплата'
                  : 'Instant delivery • Secure payment'}
              </p>
            </div>
          </div>

          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -mr-20 -mt-20" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full -ml-16 -mb-16" />
        </div>

        {/* Username Input */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-tg-text px-1">
            {language === 'ru' ? 'Telegram username' : 'Telegram username'}
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-tg-hint">@</span>
            <input
              type="text"
              value={username.replace('@', '')}
              onChange={(e) => setUsername(e.target.value.replace('@', ''))}
              placeholder={language === 'ru' ? 'username' : 'username'}
              className="w-full pl-9 pr-4 py-3.5 rounded-xl bg-tg-secondary-bg border border-tg-separator text-tg-text focus:outline-none focus:border-accent-cyan transition-colors"
            />
          </div>
          <p className="text-xs text-tg-hint px-1">
            {language === 'ru'
              ? 'Stars будут отправлены на этот аккаунт'
              : 'Stars will be sent to this account'}
          </p>
        </div>

        {/* Packages */}
        <div className="space-y-3">
          <h2 className="text-base font-semibold text-tg-text px-1">
            {language === 'ru' ? 'Выберите пакет' : 'Choose package'}
          </h2>

          <div className="space-y-2">
            {starPackages.map((pkg) => (
              <button
                key={pkg.id}
                onClick={() => handlePackageSelect(pkg)}
                className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                  selectedPackage.id === pkg.id
                    ? 'border-accent-cyan bg-accent-cyan/5'
                    : 'border-tg-separator bg-tg-secondary-bg'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="text-3xl">⭐</div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-tg-text">
                          {pkg.amount.toLocaleString()}
                        </span>
                        {pkg.popular && (
                          <span className="text-xs px-2 py-0.5 bg-accent-cyan text-white rounded-full">
                            {language === 'ru' ? 'Популярно' : 'Popular'}
                          </span>
                        )}
                        {pkg.bonus && (
                          <span className="text-xs px-2 py-0.5 bg-green-500/20 text-green-600 dark:text-green-400 rounded-full">
                            +{pkg.bonus} {language === 'ru' ? 'бонус' : 'bonus'}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-tg-hint">
                        {formatPrice(pkg.price, 'RUB')}
                      </p>
                    </div>
                  </div>

                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                    selectedPackage.id === pkg.id
                      ? 'border-accent-cyan bg-accent-cyan'
                      : 'border-tg-separator'
                  }`}>
                    {selectedPackage.id === pkg.id && (
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* How it works */}
        <div className="bg-tg-secondary-bg rounded-2xl p-4 border border-tg-separator">
          <h3 className="text-base font-semibold text-tg-text mb-3">
            {language === 'ru' ? 'Как это работает' : 'How it works'}
          </h3>
          <div className="space-y-3">
            <div className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-accent-cyan/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-accent-cyan">1</span>
              </div>
              <div>
                <p className="text-sm font-medium text-tg-text">
                  {language === 'ru' ? 'Выберите пакет' : 'Choose package'}
                </p>
                <p className="text-xs text-tg-hint">
                  {language === 'ru' ? 'Выберите количество Stars' : 'Select Stars amount'}
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-accent-cyan/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-accent-cyan">2</span>
              </div>
              <div>
                <p className="text-sm font-medium text-tg-text">
                  {language === 'ru' ? 'Оплатите' : 'Pay'}
                </p>
                <p className="text-xs text-tg-hint">
                  {language === 'ru' ? 'Через Telegram Bot Payments' : 'Via Telegram Bot Payments'}
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-accent-cyan/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-accent-cyan">3</span>
              </div>
              <div>
                <p className="text-sm font-medium text-tg-text">
                  {language === 'ru' ? 'Получите Stars' : 'Receive Stars'}
                </p>
                <p className="text-xs text-tg-hint">
                  {language === 'ru' ? 'Мгновенная доставка на ваш аккаунт' : 'Instant delivery to your account'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-tg-secondary-bg rounded-xl p-3 text-center border border-tg-separator">
            <div className="text-2xl mb-1">⚡</div>
            <p className="text-xs text-tg-hint">
              {language === 'ru' ? 'Мгновенно' : 'Instant'}
            </p>
          </div>
          <div className="bg-tg-secondary-bg rounded-xl p-3 text-center border border-tg-separator">
            <div className="text-2xl mb-1">🔒</div>
            <p className="text-xs text-tg-hint">
              {language === 'ru' ? 'Безопасно' : 'Secure'}
            </p>
          </div>
          <div className="bg-tg-secondary-bg rounded-xl p-3 text-center border border-tg-separator">
            <div className="w-12 h-12 mx-auto mb-1">
              <Lottie
                animationData={duckSuccessAnimation}
                loop={true}
                style={{ width: '100%', height: '100%' }}
              />
            </div>
            <p className="text-xs text-tg-hint">
              {language === 'ru' ? 'Гарантия' : 'Guarantee'}
            </p>
          </div>
        </div>
      </div>

      {/* Sticky Buy Button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-tg-bg/95 backdrop-blur-sm border-t border-tg-separator">
        <button
          onClick={handlePurchase}
          disabled={processing || !username.trim()}
          className="w-full bg-gradient-to-r from-purple-500 to-blue-500 text-white py-4 px-6 rounded-xl font-bold text-base hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {processing ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>{language === 'ru' ? 'Создание...' : 'Creating...'}</span>
            </>
          ) : (
            <>
              <span>⭐</span>
              <span>
                {language === 'ru' ? 'Купить' : 'Buy'} {selectedPackage.amount} Stars
              </span>
              <span className="text-sm font-normal opacity-90">
                • {formatPrice(selectedPackage.price, 'RUB')}
              </span>
            </>
          )}
        </button>
      </div>
    </div>
  )
}
