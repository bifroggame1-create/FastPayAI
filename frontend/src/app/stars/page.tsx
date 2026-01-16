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

// Import status icons (анимированные иконки)
import starIcon from '../../../public/status-icons/status-1.json'
import premiumIcon from '../../../public/status-icons/status-2.json'
import successIcon from '../../../public/status-icons/status-3.json'

interface PremiumPackage {
  id: string
  months: number
  price: number
  popular?: boolean
}

const premiumPackages: PremiumPackage[] = [
  { id: 'premium-3', months: 3, price: 540 },
  { id: 'premium-6', months: 6, price: 900, popular: true },
  { id: 'premium-12', months: 12, price: 1620 }
]

// Constants for Stars
const MIN_STARS = 50
const MAX_STARS = 20000

export default function StarsPage() {
  const router = useRouter()
  const { user, language } = useAppStore()
  const [activeTab, setActiveTab] = useState<'stars' | 'premium'>('stars')
  const [starsAmount, setStarsAmount] = useState<number>(100)
  const [selectedPremium, setSelectedPremium] = useState<PremiumPackage>(premiumPackages[1])
  const [username, setUsername] = useState(user?.username || '')
  const [processing, setProcessing] = useState(false)

  const handleStarsAmountChange = (value: number) => {
    // Clamp value between min and max
    const clampedValue = Math.max(MIN_STARS, Math.min(MAX_STARS, value))
    setStarsAmount(clampedValue)
    hapticImpact('light')
  }

  const handlePremiumSelect = (pkg: PremiumPackage) => {
    setSelectedPremium(pkg)
    hapticImpact('light')
  }

  // Calculate price dynamically (1.8 RUB per star with markup)
  const calculateStarsPrice = (amount: number): number => {
    return Math.ceil(amount * 1.8)
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
          stars: starsAmount,
          price: calculateStarsPrice(starsAmount),
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
                ? `${starsAmount} ⭐ Stars доставлены!`
                : `${starsAmount} ⭐ Stars delivered!`)
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
              <div className="w-5 h-5">
                <Lottie
                  animationData={starIcon}
                  loop={true}
                  style={{ width: '100%', height: '100%' }}
                />
              </div>
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
              <div className="w-5 h-5">
                <Lottie
                  animationData={premiumIcon}
                  loop={true}
                  style={{ width: '100%', height: '100%' }}
                />
              </div>
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

        {/* Amount Input - Stars */}
        {activeTab === 'stars' && (
          <div className="space-y-4">
            {/* Amount Input */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-tg-text px-1 flex items-center gap-2">
                <div className="w-4 h-4">
                  <Lottie
                    animationData={starIcon}
                    loop={true}
                    style={{ width: '100%', height: '100%' }}
                  />
                </div>
                <span>{language === 'ru' ? `Введите сумму (${MIN_STARS} - ${MAX_STARS.toLocaleString()})` : `Enter amount (${MIN_STARS} - ${MAX_STARS.toLocaleString()})`}</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={starsAmount}
                  onChange={(e) => handleStarsAmountChange(parseInt(e.target.value) || MIN_STARS)}
                  min={MIN_STARS}
                  max={MAX_STARS}
                  className="w-full px-4 py-3.5 rounded-xl bg-tg-secondary-bg border border-tg-separator text-tg-text text-lg font-semibold focus:outline-none focus:border-accent-cyan transition-colors"
                  placeholder={MIN_STARS.toString()}
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-tg-hint">
                  ≈ {formatPrice(calculateStarsPrice(starsAmount), 'RUB')}
                </div>
              </div>
            </div>

            {/* Range Slider */}
            <div className="relative px-1">
              <input
                type="range"
                value={starsAmount}
                onChange={(e) => handleStarsAmountChange(parseInt(e.target.value))}
                min={MIN_STARS}
                max={MAX_STARS}
                step={10}
                className="w-full h-2 bg-tg-separator rounded-lg appearance-none cursor-pointer accent-accent-cyan slider"
                style={{
                  background: `linear-gradient(to right, rgb(6 182 212) 0%, rgb(6 182 212) ${((starsAmount - MIN_STARS) / (MAX_STARS - MIN_STARS)) * 100}%, rgb(42 45 55) ${((starsAmount - MIN_STARS) / (MAX_STARS - MIN_STARS)) * 100}%, rgb(42 45 55) 100%)`
                }}
              />
              <div className="flex items-center justify-between mt-2 text-xs text-tg-hint">
                <span className="flex items-center gap-1">
                  <div className="w-3 h-3">
                    <Lottie
                      animationData={starIcon}
                      loop={true}
                      style={{ width: '100%', height: '100%' }}
                    />
                  </div>
                  <span>{MIN_STARS}</span>
                </span>
                <span className="flex items-center gap-1">
                  <div className="w-3 h-3">
                    <Lottie
                      animationData={starIcon}
                      loop={true}
                      style={{ width: '100%', height: '100%' }}
                    />
                  </div>
                  <span>{MAX_STARS.toLocaleString()}</span>
                </span>
              </div>
            </div>

            {/* Quick amounts */}
            <div className="grid grid-cols-4 gap-2">
              {[100, 500, 1000, 5000].map((amount) => (
                <button
                  key={amount}
                  onClick={() => handleStarsAmountChange(amount)}
                  className={`py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                    starsAmount === amount
                      ? 'bg-accent-cyan text-white'
                      : 'bg-tg-secondary-bg text-tg-text border border-tg-separator hover:border-accent-cyan'
                  }`}
                >
                  {amount.toLocaleString()}
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
                      <div className="w-10 h-10">
                        <Lottie
                          animationData={premiumIcon}
                          loop={true}
                          style={{ width: '100%', height: '100%' }}
                        />
                      </div>
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
              <div className="w-5 h-5">
                <Lottie
                  animationData={starIcon}
                  loop={true}
                  style={{ width: '100%', height: '100%' }}
                />
              </div>
              <span>
                {language === 'ru' ? 'Купить' : 'Buy'} {starsAmount.toLocaleString()} Stars
              </span>
              <span className="text-sm font-normal opacity-90">
                • {formatPrice(calculateStarsPrice(starsAmount), 'RUB')}
              </span>
            </>
          ) : (
            <>
              <div className="w-5 h-5">
                <Lottie
                  animationData={premiumIcon}
                  loop={true}
                  style={{ width: '100%', height: '100%' }}
                />
              </div>
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
