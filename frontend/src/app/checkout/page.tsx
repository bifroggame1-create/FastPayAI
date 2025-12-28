'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Header from '@/components/Header'
import { Product, ProductVariant } from '@/types'
import { productsApi, promoApi, paymentApi } from '@/lib/api'
import { useAppStore, CartItem } from '@/lib/store'
import { formatPrice } from '@/lib/currency'
import { formatCryptoAmount } from '@/lib/cryptoConverter'
import { t } from '@/lib/i18n'

interface CheckoutItem {
  productId: string
  productName: string
  productImage: string
  variantId?: string
  variantName?: string
  price: number
  quantity: number
}

function CheckoutContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, language, currency, cart, clearCart } = useAppStore()

  const [product, setProduct] = useState<Product | null>(null)
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null)
  const [checkoutItems, setCheckoutItems] = useState<CheckoutItem[]>([])
  const [isCartCheckout, setIsCartCheckout] = useState(false)
  const [promoCode, setPromoCode] = useState('')
  const [promoError, setPromoError] = useState('')
  const [discount, setDiscount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [paymentMethod, setPaymentMethod] = useState<'cryptobot' | 'cactuspay-sbp' | 'cactuspay-card'>('cryptobot')
  const [selectedCrypto, setSelectedCrypto] = useState<'TON' | 'USDT'>('TON')

  useEffect(() => {
    loadCheckoutData()
  }, [])

  const loadCheckoutData = async () => {
    try {
      const fromCart = searchParams.get('fromCart') === 'true'
      const productId = searchParams.get('productId')
      const variantId = searchParams.get('variantId')

      if (fromCart) {
        // Cart checkout mode
        if (cart.length === 0) {
          router.push('/cart')
          return
        }
        setIsCartCheckout(true)
        setCheckoutItems(cart)
      } else if (productId) {
        // Single product checkout mode
        const productData = await productsApi.getById(productId)
        setProduct(productData)

        let variant: ProductVariant | null = null
        if (variantId && productData.variants) {
          variant = productData.variants.find(v => v.id === variantId) || null
        } else if (productData.variants && productData.variants.length > 0) {
          variant = productData.variants[0]
        }

        if (variant) {
          setSelectedVariant(variant)
        }

        // Create checkout item from product
        setCheckoutItems([{
          productId: productData._id,
          productName: productData.name,
          productImage: productData.images[0] || '/placeholder.jpg',
          variantId: variant?.id,
          variantName: variant?.name,
          price: variant?.price || productData.price,
          quantity: 1
        }])
      } else {
        router.push('/')
        return
      }
    } catch (error) {
      console.error('Error loading checkout data:', error)
      router.push('/')
    } finally {
      setLoading(false)
    }
  }

  // Calculate base total from all items
  const itemsTotal = checkoutItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const totalQuantity = checkoutItems.reduce((sum, item) => sum + item.quantity, 0)

  const handleApplyPromo = async () => {
    if (!promoCode.trim()) {
      setPromoError('Введите промокод')
      return
    }

    try {
      const result = await promoApi.validate(promoCode, itemsTotal)

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
    if (checkoutItems.length === 0) return

    // Generate description based on items
    const getDescription = () => {
      if (checkoutItems.length === 1) {
        const item = checkoutItems[0]
        return item.variantName
          ? `Оплата: ${item.productName} - ${item.variantName}`
          : `Оплата: ${item.productName}`
      }
      return `Оплата заказа (${totalQuantity} товаров)`
    }

    const openPaymentUrl = (url: string) => {
      if (window.Telegram?.WebApp && (window.Telegram.WebApp as any).openLink) {
        (window.Telegram.WebApp as any).openLink(url)
      } else {
        window.open(url, '_blank')
      }
      // Clear cart after initiating payment if it's a cart checkout
      if (isCartCheckout) {
        clearCart()
      }
    }

    // Для CryptoBot используем крипту
    if (paymentMethod === 'cryptobot') {
      try {
        setLoading(true)

        const invoiceParams = {
          amount: finalPrice,
          description: getDescription(),
          productId: checkoutItems[0].productId,
          variantId: checkoutItems[0].variantId,
          asset: selectedCrypto,
          // Pass all items for multi-item orders
          items: checkoutItems.length > 1 ? checkoutItems : undefined,
        }

        console.log('[FastPay] Creating invoice:', invoiceParams)

        const response = await paymentApi.createInvoice(invoiceParams)

        console.log('[FastPay] Invoice response:', response)

        if (response.success && response.invoice) {
          openPaymentUrl(response.invoice.payUrl)
        } else {
          const errorMsg = response.error || 'Неизвестная ошибка'
          const details = response.details ? `\n\nДетали: ${JSON.stringify(response.details)}` : ''
          alert('Ошибка создания платежа:\n' + errorMsg + details)
        }
      } catch (error: any) {
        console.error('Checkout error:', error)
        let errorMessage = 'Ошибка при создании платежа'

        if (error.response?.data?.error) {
          errorMessage = error.response.data.error
        } else if (error.message) {
          errorMessage = error.message
        }

        if (error.response?.data?.details) {
          errorMessage += '\n\nДетали: ' + JSON.stringify(error.response.data.details)
        }

        alert(errorMessage)
      } finally {
        setLoading(false)
      }
    } else if (paymentMethod === 'cactuspay-sbp' || paymentMethod === 'cactuspay-card') {
      // CactusPay payment (SBP or Card)
      try {
        setLoading(true)

        const cactusMethod = paymentMethod === 'cactuspay-sbp' ? 'sbp' : 'card'

        const paymentParams = {
          amount: finalPrice,
          description: getDescription(),
          productId: checkoutItems[0].productId,
          variantId: checkoutItems[0].variantId,
          method: cactusMethod as 'sbp' | 'card',
          items: checkoutItems.length > 1 ? checkoutItems : undefined,
        }

        console.log('[FastPay] Creating CactusPay payment:', paymentParams)

        const response = await paymentApi.createCactusPayment(paymentParams)

        console.log('[FastPay] CactusPay response:', response)

        if (response.success && response.payment) {
          openPaymentUrl(response.payment.payUrl)
        } else {
          const errorMsg = response.error || 'Неизвестная ошибка'
          alert('Ошибка создания платежа:\n' + errorMsg)
        }
      } catch (error: any) {
        console.error('CactusPay checkout error:', error)
        let errorMessage = 'Ошибка при создании платежа'

        if (error.response?.data?.error) {
          errorMessage = error.response.data.error
        } else if (error.message) {
          errorMessage = error.message
        }

        alert(errorMessage)
      } finally {
        setLoading(false)
      }
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-light-bg dark:bg-dark-bg flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent-cyan"></div>
      </div>
    )
  }

  if (checkoutItems.length === 0 && !loading) {
    return (
      <div className="min-h-screen bg-light-bg dark:bg-dark-bg flex items-center justify-center">
        <p className="text-light-text-secondary dark:text-dark-text-secondary">Товары не найдены</p>
      </div>
    )
  }

  const discountedPrice = itemsTotal - discount

  // Add 5% markup for CryptoBot payments (no markup for CactusPay)
  const cryptoBotMarkup = paymentMethod === 'cryptobot' ? discountedPrice * 0.05 : 0
  const finalPrice = discountedPrice + cryptoBotMarkup
  const isCactusPay = paymentMethod.startsWith('cactuspay')

  const bonusToUse = Math.min(user?.bonusBalance || 0, finalPrice * 0.3) // Можно использовать до 30% от суммы

  return (
    <div className="min-h-screen bg-light-bg dark:bg-dark-bg pb-32">
      <Header
        title={t('checkout', language)}
        showBack
        onBack={() => router.back()}
      />

      <div className="px-4 py-6 space-y-4">
        {/* Order Summary */}
        <div className="bg-light-card dark:bg-dark-card rounded-2xl p-4 border border-light-border dark:border-dark-border">
          <h2 className="text-lg font-semibold mb-4 text-light-text dark:text-dark-text">
            {t('yourOrder', language)} {checkoutItems.length > 1 && `(${totalQuantity} шт.)`}
          </h2>

          <div className="space-y-3">
            {checkoutItems.map((item, index) => (
              <div key={`${item.productId}-${item.variantId || index}`} className="flex gap-4">
                <img
                  src={item.productImage}
                  alt={item.productName}
                  className="w-16 h-16 object-cover rounded-xl"
                />
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-light-text dark:text-dark-text truncate">
                    {item.productName}
                  </h3>
                  {item.variantName && (
                    <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                      {item.variantName}
                    </p>
                  )}
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-accent-cyan font-bold">
                      {formatPrice(item.price, currency)}
                    </p>
                    {item.quantity > 1 && (
                      <span className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                        × {item.quantity}
                      </span>
                    )}
                  </div>
                  {paymentMethod === 'cryptobot' && (
                    <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary">
                      ≈ {formatCryptoAmount(item.price * item.quantity, selectedCrypto)}
                    </p>
                  )}
                </div>
              </div>
            ))}
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
              onClick={() => setPaymentMethod('cactuspay-sbp')}
              className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                paymentMethod === 'cactuspay-sbp'
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
                <div className="flex-1">
                  <p className="font-medium text-light-text dark:text-dark-text">СБП (Система быстрых платежей)</p>
                  <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                    Оплата через QR-код или по номеру телефона
                  </p>
                </div>
                <span className="text-xs px-2 py-1 bg-green-500/20 text-green-500 rounded-full">Рубли</span>
              </div>
            </button>

            <button
              onClick={() => setPaymentMethod('cactuspay-card')}
              className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                paymentMethod === 'cactuspay-card'
                  ? 'border-accent-cyan bg-accent-cyan/10'
                  : 'border-light-border dark:border-dark-border'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="font-medium text-light-text dark:text-dark-text">Банковская карта</p>
                  <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                    Visa, Mastercard, МИР
                  </p>
                </div>
                <span className="text-xs px-2 py-1 bg-green-500/20 text-green-500 rounded-full">Рубли</span>
              </div>
            </button>
          </div>
        </div>

        {/* Price Summary */}
        <div className="bg-light-card dark:bg-dark-card rounded-2xl p-4 border border-light-border dark:border-dark-border">
          <div className="space-y-2">
            <div className="flex justify-between text-light-text dark:text-dark-text">
              <span>{checkoutItems.length > 1 ? `Товары (${totalQuantity} шт.)` : t('productPrice', language)}:</span>
              <span>{formatPrice(itemsTotal, currency)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-green-500">
                <span>{t('promoDiscount', language)}:</span>
                <span>-{formatPrice(discount, currency)}</span>
              </div>
            )}
            {paymentMethod === 'cryptobot' && cryptoBotMarkup > 0 && (
              <div className="flex justify-between text-orange-500 text-sm">
                <span>Комиссия CryptoBot (+5%):</span>
                <span>+{formatPrice(cryptoBotMarkup, currency)}</span>
              </div>
            )}
            <div className="border-t border-light-border dark:border-dark-border pt-2 mt-2">
              <div className="flex justify-between text-xl font-bold text-light-text dark:text-dark-text">
                <span>{t('total', language)}:</span>
                <span className="text-accent-cyan">{formatPrice(finalPrice, currency)}</span>
              </div>
              {paymentMethod === 'cryptobot' && (
                <div className="flex justify-between text-sm text-light-text-secondary dark:text-dark-text-secondary mt-1">
                  <span>≈ {formatCryptoAmount(finalPrice, selectedCrypto)}</span>
                </div>
              )}
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
