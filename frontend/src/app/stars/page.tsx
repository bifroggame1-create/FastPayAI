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

interface PremiumPackage {
  id: string
  months: number
  price: number
  popular?: boolean
}

const starPackages: StarPackage[] = [
  { id: '50', amount: 50, price: 90 },
  { id: '100', amount: 100, price: 180, popular: true },
  { id: '500', amount: 500, price: 900, bonus: 50 },
  { id: '1000', amount: 1000, price: 1800, bonus: 150 },
  { id: '2500', amount: 2500, price: 4500, bonus: 500 }
]

const premiumPackages: PremiumPackage[] = [
  { id: 'premium-3', months: 3, price: 540 },
  { id: 'premium-6', months: 6, price: 900, popular: true },
  { id: 'premium-12', months: 12, price: 1620 }
]

export default function StarsPage() {
  const router = useRouter()
  const { user, language } = useAppStore()
  const [activeTab, setActiveTab] = useState<'stars' | 'premium'>('stars')
  const [selectedPackage, setSelectedPackage] = useState<StarPackage>(starPackages[1])
  const [selectedPremium, setSelectedPremium] = useState<PremiumPackage>(premiumPackages[1])
  const [username, setUsername] = useState(user?.username || '')
  const [processing, setProcessing] = useState(false)

  const handlePackageSelect = (pkg: StarPackage) => {
    setSelectedPackage(pkg)
    hapticImpact('light')
  }

  const handlePremiumSelect = (pkg: PremiumPackage) => {
    setSelectedPremium(pkg)
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
        title={activeTab === 'stars'
          ? (language === 'ru' ? 'Купить Telegram Stars' : 'Buy Telegram Stars')
          : (language === 'ru' ? 'Купить Premium' : 'Buy Premium')}
        showBack
        onBack={() => router.back()}
      />

      <div className="px-4 py-4 space-y-4">
        {/* Tabs */}
        <div className="flex gap-2 bg-tg-secondary-bg p-1 rounded-xl">
          <button
            onClick={() => {
              setActiveTab('stars')
              hapticImpact('light')
            }}
            className={`flex-1 py-2.5 px-4 rounded-lg font-medium transition-all ${
              activeTab === 'stars'
                ? 'bg-accent-cyan text-white'
                : 'text-tg-hint hover:text-tg-text'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <span>⭐</span>
              <span>{language === 'ru' ? 'Stars' : 'Stars'}</span>
            </div>
          </button>
          <button
            onClick={() => {
              setActiveTab('premium')
              hapticImpact('light')
            }}
            className={`flex-1 py-2.5 px-4 rounded-lg font-medium transition-all ${
              activeTab === 'premium'
                ? 'bg-accent-cyan text-white'
                : 'text-tg-hint hover:text-tg-text'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <span>👑</span>
              <span>{language === 'ru' ? 'Premium' : 'Premium'}</span>
            </div>
          </button>
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
            {activeTab === 'stars'
              ? (language === 'ru' ? 'Stars будут отправлены на этот аккаунт' : 'Stars will be sent to this account')
              : (language === 'ru' ? 'Premium подписка будет активирована для этого аккаунта' : 'Premium subscription will be activated for this account')}
          </p>
        </div>

        {/* Packages - Stars */}
        {activeTab === 'stars' && (
          <div className="space-y-3">
            <h2 className="text-base font-semibold text-tg-text px-1">
              {language === 'ru' ? 'Выберите количество' : 'Choose amount'}
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
        )}

        {/* Packages - Premium */}
        {activeTab === 'premium' && (
          <div className="space-y-3">
            <h2 className="text-base font-semibold text-tg-text px-1">
              {language === 'ru' ? 'Выберите период' : 'Choose period'}
            </h2>

            <div className="space-y-2">
              {premiumPackages.map((pkg) => (
                <button
                  key={pkg.id}
                  onClick={() => handlePremiumSelect(pkg)}
                  className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                    selectedPremium.id === pkg.id
                      ? 'border-accent-cyan bg-accent-cyan/5'
                      : 'border-tg-separator bg-tg-secondary-bg'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="text-3xl">👑</div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-bold text-tg-text">
                            {pkg.months} {language === 'ru'
                              ? (pkg.months === 3 ? 'месяца' : pkg.months === 6 ? 'месяцев' : pkg.months === 12 ? 'месяцев' : 'мес')
                              : (pkg.months === 1 ? 'month' : 'months')}
                          </span>
                          {pkg.popular && (
                            <span className="text-xs px-2 py-0.5 bg-accent-cyan text-white rounded-full">
                              {language === 'ru' ? 'Популярно' : 'Popular'}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-tg-hint">
                          {formatPrice(pkg.price, 'RUB')}
                        </p>
                      </div>
                    </div>

                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                      selectedPremium.id === pkg.id
                        ? 'border-accent-cyan bg-accent-cyan'
                        : 'border-tg-separator'
                    }`}>
                      {selectedPremium.id === pkg.id && (
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
        )}

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
          ) : activeTab === 'stars' ? (
            <>
              <span>⭐</span>
              <span>
                {language === 'ru' ? 'Купить' : 'Buy'} {selectedPackage.amount} Stars
              </span>
              <span className="text-sm font-normal opacity-90">
                • {formatPrice(selectedPackage.price, 'RUB')}
              </span>
            </>
          ) : (
            <>
              <span>👑</span>
              <span>
                {language === 'ru' ? 'Купить Premium' : 'Buy Premium'} {selectedPremium.months} {language === 'ru' ? 'мес' : 'mo'}
              </span>
              <span className="text-sm font-normal opacity-90">
                • {formatPrice(selectedPremium.price, 'RUB')}
              </span>
            </>
          )}
        </button>
      </div>
    </div>
  )
}
