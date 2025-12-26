'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Header from '@/components/Header'
import { Product, ProductVariant } from '@/types'
import { productsApi, promoApi, paymentApi } from '@/lib/api'
import { useAppStore } from '@/lib/store'

function CheckoutContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAppStore()

  const [product, setProduct] = useState<Product | null>(null)
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null)
  const [promoCode, setPromoCode] = useState('')
  const [promoError, setPromoError] = useState('')
  const [discount, setDiscount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [paymentMethod, setPaymentMethod] = useState<'cryptobot' | 'qr-sbp' | 'card'>('cryptobot')
  const [selectedCrypto, setSelectedCrypto] = useState<'TON' | 'USDT'>('TON')

  useEffect(() => {
    loadCheckoutData()
  }, [])

  const loadCheckoutData = async () => {
    try {
      const productId = searchParams.get('productId')
      const variantId = searchParams.get('variantId')

      if (!productId) {
        router.push('/')
        return
      }

      const productData = await productsApi.getById(productId)
      setProduct(productData)

      if (variantId && productData.variants) {
        const variant = productData.variants.find(v => v.id === variantId)
        if (variant) {
          setSelectedVariant(variant)
        }
      } else if (productData.variants && productData.variants.length > 0) {
        setSelectedVariant(productData.variants[0])
      }
    } catch (error) {
      console.error('Error loading checkout data:', error)
      router.push('/')
    } finally {
      setLoading(false)
    }
  }

  const handleApplyPromo = async () => {
    if (!promoCode.trim()) {
      setPromoError('Введите промокод')
      return
    }

    try {
      const orderAmount = selectedVariant?.price || product?.price || 0
      const result = await promoApi.validate(promoCode, orderAmount)

      if (result.valid) {
        setDiscount(result.discount)
        setPromoError('')
      } else {
        setPromoError(result.message || 'Промокод недействителен')
        setDiscount(0)
      }
    } catch (error) {
      setPromoError('Ошибка проверки промокода')
      setDiscount(0)
    }
  }

  const handleCheckout = async () => {
    if (!product) return

    // Для CryptoBot используем крипту
    if (paymentMethod === 'cryptobot') {
      try {
        setLoading(true)

        const productName = selectedVariant
          ? `${product.name} - ${selectedVariant.name}`
          : product.name

        const response = await paymentApi.createInvoice({
          amount: finalPrice,
          description: `Оплата: ${productName}`,
          productId: product._id,
          variantId: selectedVariant?.id,
          asset: selectedCrypto,
        })

        if (response.success && response.invoice) {
          // Открываем ссылку на оплату в Telegram
          if (window.Telegram?.WebApp && (window.Telegram.WebApp as any).openLink) {
            (window.Telegram.WebApp as any).openLink(response.invoice.payUrl)
          } else {
            // Fallback для веб-браузера
            window.open(response.invoice.payUrl, '_blank')
          }
        } else {
          alert('Ошибка создания инвойса: ' + (response.error || 'Неизвестная ошибка'))
        }
      } catch (error: any) {
        console.error('Checkout error:', error)
        alert('Ошибка при создании платежа: ' + (error.message || 'Неизвестная ошибка'))
      } finally {
        setLoading(false)
      }
    } else if (paymentMethod === 'qr-sbp') {
      // Для QR СБП - пока заглушка
      alert('Оплата через QR код СБП в разработке')
    } else {
      // Для карты - пока заглушка
      alert('Оплата картой в разработке')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-light-bg dark:bg-dark-bg flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent-cyan"></div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-light-bg dark:bg-dark-bg flex items-center justify-center">
        <p className="text-light-text-secondary dark:text-dark-text-secondary">Товар не найден</p>
      </div>
    )
  }

  const basePrice = selectedVariant?.price || product.price
  const finalPrice = basePrice - discount
  const bonusToUse = Math.min(user?.bonusBalance || 0, finalPrice * 0.3) // Можно использовать до 30% от суммы

  return (
    <div className="min-h-screen bg-light-bg dark:bg-dark-bg pb-32">
      <Header
        title="Оформление заказа"
        showBack
        onBack={() => router.back()}
      />

      <div className="px-4 py-6 space-y-4">
        {/* Order Summary */}
        <div className="bg-light-card dark:bg-dark-card rounded-2xl p-4 border border-light-border dark:border-dark-border">
          <h2 className="text-lg font-semibold mb-4 text-light-text dark:text-dark-text">
            Ваш заказ
          </h2>

          <div className="flex gap-4 mb-4">
            <img
              src={product.images[0]}
              alt={product.name}
              className="w-20 h-20 object-cover rounded-xl"
            />
            <div className="flex-1">
              <h3 className="font-semibold text-light-text dark:text-dark-text">
                {product.name}
              </h3>
              {selectedVariant && (
                <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                  {selectedVariant.name}
                </p>
              )}
              <p className="text-accent-cyan font-bold mt-1">
                {basePrice.toLocaleString('ru-RU')} ₽
              </p>
            </div>
          </div>
        </div>

        {/* Promo Code */}
        <div className="bg-light-card dark:bg-dark-card rounded-2xl p-4 border border-light-border dark:border-dark-border">
          <h3 className="text-base font-semibold mb-3 text-light-text dark:text-dark-text">
            Промокод
          </h3>
          <div className="flex gap-2 items-stretch">
            <input
              type="text"
              value={promoCode}
              onChange={(e) => {
                setPromoCode(e.target.value.toUpperCase())
                setPromoError('')
              }}
              placeholder="Введите промокод"
              className="flex-1 px-4 py-3 rounded-xl bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border text-light-text dark:text-dark-text focus:outline-none focus:border-accent-cyan"
            />
            <button
              onClick={handleApplyPromo}
              className="px-4 py-3 bg-accent-cyan text-white rounded-xl font-medium hover:bg-accent-blue transition-colors whitespace-nowrap"
            >
              Применить
            </button>
          </div>
          {promoError && (
            <p className="text-red-500 text-sm mt-2">{promoError}</p>
          )}
          {discount > 0 && (
            <p className="text-green-500 text-sm mt-2">
              Скидка: -{discount.toLocaleString('ru-RU')} ₽
            </p>
          )}
        </div>

        {/* Bonus Balance */}
        {user?.bonusBalance && user.bonusBalance > 0 && (
          <div className="bg-gradient-to-r from-accent-blue to-accent-cyan rounded-2xl p-4 text-white">
            <h3 className="text-base font-semibold mb-2">Бонусный баланс</h3>
            <p className="text-sm opacity-90 mb-2">
              Доступно: {user.bonusBalance} ₽
            </p>
            <p className="text-sm opacity-90">
              Можно использовать до {bonusToUse.toFixed(0)} ₽ для этого заказа
            </p>
          </div>
        )}

        {/* Payment Method */}
        <div className="bg-light-card dark:bg-dark-card rounded-2xl p-4 border border-light-border dark:border-dark-border">
          <h3 className="text-base font-semibold mb-3 text-light-text dark:text-dark-text">
            Способ оплаты
          </h3>
          <div className="space-y-3">
            <button
              onClick={() => setPaymentMethod('cryptobot')}
              className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                paymentMethod === 'cryptobot'
                  ? 'border-accent-cyan bg-accent-cyan/10'
                  : 'border-light-border dark:border-dark-border'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 flex items-center justify-center rounded-lg overflow-hidden">
                  <img
                    src="/payment-icons/cryptobot.jpg"
                    alt="CryptoBot"
                    className="w-10 h-10 object-cover"
                  />
                </div>
                <div>
                  <p className="font-medium text-light-text dark:text-dark-text">CryptoBot</p>
                  <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                    TON, USDT
                  </p>
                </div>
              </div>
            </button>

            {paymentMethod === 'cryptobot' && (
              <div className="ml-4 space-y-2">
                <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary mb-2">
                  Выберите криптовалюту:
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedCrypto('TON')}
                    className={`flex-1 px-4 py-3 rounded-lg border-2 transition-all flex items-center justify-center gap-2 ${
                      selectedCrypto === 'TON'
                        ? 'border-accent-cyan bg-accent-cyan/10 text-accent-cyan font-semibold'
                        : 'border-light-border dark:border-dark-border text-light-text dark:text-dark-text'
                    }`}
                  >
                    <img src="/payment-icons/ton.svg" alt="TON" className="w-6 h-6" />
                    TON
                  </button>
                  <button
                    onClick={() => setSelectedCrypto('USDT')}
                    className={`flex-1 px-4 py-3 rounded-lg border-2 transition-all flex items-center justify-center gap-2 ${
                      selectedCrypto === 'USDT'
                        ? 'border-accent-cyan bg-accent-cyan/10 text-accent-cyan font-semibold'
                        : 'border-light-border dark:border-dark-border text-light-text dark:text-dark-text'
                    }`}
                  >
                    <img src="/payment-icons/usdt.svg" alt="USDT" className="w-6 h-6" />
                    USDT
                  </button>
                </div>
              </div>
            )}

            <button
              onClick={() => setPaymentMethod('qr-sbp')}
              className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                paymentMethod === 'qr-sbp'
                  ? 'border-accent-cyan bg-accent-cyan/10'
                  : 'border-light-border dark:border-dark-border'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 flex items-center justify-center rounded-lg overflow-hidden">
                  <img
                    src="/payment-icons/sbp.webp"
                    alt="СБП"
                    className="w-10 h-10 object-cover"
                  />
                </div>
                <div>
                  <p className="font-medium text-light-text dark:text-dark-text">QR код СБП</p>
                  <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                    Система быстрых платежей
                  </p>
                </div>
              </div>
            </button>

            <button
              onClick={() => setPaymentMethod('card')}
              className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                paymentMethod === 'card'
                  ? 'border-accent-cyan bg-accent-cyan/10'
                  : 'border-light-border dark:border-dark-border'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-light-text dark:text-dark-text">Банковская карта</p>
                  <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                    Visa, Mastercard, МИР
                  </p>
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Price Summary */}
        <div className="bg-light-card dark:bg-dark-card rounded-2xl p-4 border border-light-border dark:border-dark-border">
          <div className="space-y-2">
            <div className="flex justify-between text-light-text dark:text-dark-text">
              <span>Цена товара:</span>
              <span>{basePrice.toLocaleString('ru-RU')} ₽</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-green-500">
                <span>Скидка по промокоду:</span>
                <span>-{discount.toLocaleString('ru-RU')} ₽</span>
              </div>
            )}
            <div className="border-t border-light-border dark:border-dark-border pt-2 mt-2">
              <div className="flex justify-between text-xl font-bold text-light-text dark:text-dark-text">
                <span>Итого:</span>
                <span className="text-accent-cyan">{finalPrice.toLocaleString('ru-RU')} ₽</span>
              </div>
            </div>
          </div>
        </div>

        {/* Checkout Button */}
        <button
          onClick={handleCheckout}
          className="w-full bg-accent-cyan text-white py-4 rounded-2xl font-semibold text-lg hover:bg-accent-blue transition-colors shadow-lg"
        >
          Перейти к оплате
        </button>

        {/* Security Info */}
        <div className="flex items-center justify-center gap-2 text-sm text-light-text-secondary dark:text-dark-text-secondary">
          <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <span>Безопасная оплата через защищённое соединение</span>
        </div>
      </div>
    </div>
  )
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-light-bg dark:bg-dark-bg flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent-cyan"></div>
      </div>
    }>
      <CheckoutContent />
    </Suspense>
  )
}
