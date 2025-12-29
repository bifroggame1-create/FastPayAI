'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Header from '@/components/Header'
import ProductCard from '@/components/ProductCard'
import BottomNav from '@/components/BottomNav'
import ProductCover from '@/components/ProductCover'
import { ProductDetailSkeleton } from '@/components/Skeleton'
import { Product, ProductVariant } from '@/types'
import { productsApi } from '@/lib/api'
import { useAppStore } from '@/lib/store'
import { formatPrice } from '@/lib/currency'

/**
 * Product Detail Page - Transaction-focused design
 *
 * Hierarchy:
 * 1. Product image
 * 2. Product name + price
 * 3. Variant selector
 * 4. Primary CTA
 * 5. Protection indicator
 * 6. What you get (collapsed)
 * 7. How it works (collapsed)
 * 8. Seller info (secondary)
 */
export default function ProductDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [product, setProduct] = useState<Product | null>(null)
  const [recommendedProducts, setRecommendedProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null)
  const [expandedSection, setExpandedSection] = useState<string | null>(null)
  const { language, currency } = useAppStore()

  useEffect(() => {
    loadProduct()
  }, [params.id])

  const loadProduct = async () => {
    try {
      setLoading(true)
      const data = await productsApi.getById(params.id as string)
      setProduct(data)

      if (data.variants && data.variants.length > 0) {
        setSelectedVariant(data.variants[0])
      }

      const allProducts = await productsApi.getAll({ category: data.category })
      const recommended = allProducts.filter(p => p._id !== data._id).slice(0, 4)
      setRecommendedProducts(recommended)
    } catch (error) {
      console.error('Error loading product:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0D0D0F] pb-32">
        <Header showBack onBack={() => router.back()} />
        <ProductDetailSkeleton />
        <BottomNav />
      </div>
    )
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-[#0D0D0F] flex items-center justify-center">
        <p className="text-[#5C5C66]">
          {language === 'ru' ? 'Товар не найден' : 'Product not found'}
        </p>
      </div>
    )
  }

  const hasAutoDelivery = (product as any).deliveryType === 'auto'
  const currentPrice = selectedVariant?.price || product.price

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section)
  }

  return (
    <div className="min-h-screen bg-[#0D0D0F] pb-32">
      {/* Minimal header */}
      <div className="sticky top-0 z-20 bg-[#0D0D0F]/95 backdrop-blur-sm">
        <div className="flex items-center h-14 px-4">
          <button
            onClick={() => router.back()}
            className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-[#16161A] transition-colors"
          >
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Product Cover - Large */}
      <div className="px-4 mb-6">
        <ProductCover
          src={product.images[0] || '/placeholder.jpg'}
          alt={product.name}
          className="w-full max-w-sm mx-auto"
        />
      </div>

      <div className="px-4">
        {/* Product Name */}
        <h1 className="text-xl font-semibold text-white mb-2 leading-tight">
          {product.name}
        </h1>

        {/* Category descriptor */}
        <p className="text-sm text-[#5C5C66] mb-4">
          {product.category.charAt(0).toUpperCase() + product.category.slice(1)}
        </p>

        {/* Price */}
        <p className="text-3xl font-bold text-white mb-6">
          {formatPrice(currentPrice, currency)}
        </p>

        {/* Variant Selector - Pill buttons */}
        {product.variants && product.variants.length > 0 && (
          <div className="mb-6">
            <div className="flex flex-wrap gap-2">
              {product.variants.map((variant) => (
                <button
                  key={variant.id}
                  onClick={() => setSelectedVariant(variant)}
                  className={`px-4 py-2.5 rounded-full text-sm font-medium transition-all ${
                    selectedVariant?.id === variant.id
                      ? 'bg-[#00D4AA] text-[#0D0D0F]'
                      : 'bg-[#16161A] text-white border border-[#2A2A30] hover:border-[#3A3A40]'
                  }`}
                >
                  {variant.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Primary CTA */}
        <button
          onClick={() => {
            const params = new URLSearchParams({
              productId: product._id,
              ...(selectedVariant && { variantId: selectedVariant.id })
            })
            router.push(`/checkout?${params.toString()}`)
          }}
          className="w-full bg-[#00D4AA] hover:bg-[#00E5BB] text-[#0D0D0F] font-semibold py-4 rounded-xl transition-colors text-base mb-4"
        >
          {language === 'ru' ? 'Оформить покупку' : 'Purchase'}
        </button>

        {/* Protection indicator - single line */}
        <div className="flex items-center justify-center gap-2 mb-8 py-3">
          <svg className="w-4 h-4 text-[#00D4AA]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          <span className="text-sm text-[#A0A0A8]">
            {language === 'ru' ? 'Защита покупателя' : 'Buyer protection'}
          </span>
        </div>

        {/* Collapsible Sections */}
        <div className="space-y-2 mb-8">
          {/* What you get */}
          <div className="bg-[#16161A] rounded-xl border border-[#2A2A30] overflow-hidden">
            <button
              onClick={() => toggleSection('what')}
              className="w-full px-4 py-4 flex items-center justify-between"
            >
              <span className="font-medium text-white">
                {language === 'ru' ? 'Что вы получите' : 'What you get'}
              </span>
              <svg
                className={`w-5 h-5 text-[#5C5C66] transition-transform ${expandedSection === 'what' ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {expandedSection === 'what' && (
              <div className="px-4 pb-4 pt-0 border-t border-[#2A2A30]">
                <ul className="space-y-3 pt-4">
                  <li className="flex items-start gap-3 text-sm text-[#A0A0A8]">
                    <svg className="w-4 h-4 text-[#00D4AA] mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>{language === 'ru' ? 'Ключ активации или данные аккаунта' : 'Activation key or account credentials'}</span>
                  </li>
                  <li className="flex items-start gap-3 text-sm text-[#A0A0A8]">
                    <svg className="w-4 h-4 text-[#00D4AA] mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>{language === 'ru' ? 'Инструкция по активации' : 'Activation instructions'}</span>
                  </li>
                  {hasAutoDelivery && (
                    <li className="flex items-start gap-3 text-sm text-[#A0A0A8]">
                      <svg className="w-4 h-4 text-[#00D4AA] mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      <span>{language === 'ru' ? 'Доставка сразу после оплаты' : 'Instant delivery after payment'}</span>
                    </li>
                  )}
                </ul>
              </div>
            )}
          </div>

          {/* How it works */}
          <div className="bg-[#16161A] rounded-xl border border-[#2A2A30] overflow-hidden">
            <button
              onClick={() => toggleSection('how')}
              className="w-full px-4 py-4 flex items-center justify-between"
            >
              <span className="font-medium text-white">
                {language === 'ru' ? 'Как это работает' : 'How it works'}
              </span>
              <svg
                className={`w-5 h-5 text-[#5C5C66] transition-transform ${expandedSection === 'how' ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {expandedSection === 'how' && (
              <div className="px-4 pb-4 pt-0 border-t border-[#2A2A30]">
                <ol className="space-y-4 pt-4">
                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-[#00D4AA]/10 text-[#00D4AA] text-xs font-bold flex items-center justify-center flex-shrink-0">1</span>
                    <span className="text-sm text-[#A0A0A8]">{language === 'ru' ? 'Оплатите заказ удобным способом' : 'Complete payment using your preferred method'}</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-[#00D4AA]/10 text-[#00D4AA] text-xs font-bold flex items-center justify-center flex-shrink-0">2</span>
                    <span className="text-sm text-[#A0A0A8]">{language === 'ru' ? 'Получите товар в чат' : 'Receive product in chat'}</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-[#00D4AA]/10 text-[#00D4AA] text-xs font-bold flex items-center justify-center flex-shrink-0">3</span>
                    <span className="text-sm text-[#A0A0A8]">{language === 'ru' ? 'Активируйте и пользуйтесь' : 'Activate and use'}</span>
                  </li>
                </ol>
              </div>
            )}
          </div>

          {/* Buyer protection */}
          <div className="bg-[#16161A] rounded-xl border border-[#2A2A30] overflow-hidden">
            <button
              onClick={() => toggleSection('protection')}
              className="w-full px-4 py-4 flex items-center justify-between"
            >
              <span className="font-medium text-white">
                {language === 'ru' ? 'Защита покупателя' : 'Buyer protection'}
              </span>
              <svg
                className={`w-5 h-5 text-[#5C5C66] transition-transform ${expandedSection === 'protection' ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {expandedSection === 'protection' && (
              <div className="px-4 pb-4 pt-0 border-t border-[#2A2A30]">
                <p className="text-sm text-[#A0A0A8] pt-4 leading-relaxed">
                  {language === 'ru'
                    ? 'Ваш платеж удерживается на escrow до подтверждения получения товара. Если товар не работает — замена или возврат в течение 48 часов.'
                    : 'Your payment is held in escrow until you confirm receipt. If the product does not work — replacement or refund within 48 hours.'
                  }
                </p>
              </div>
            )}
          </div>

          {/* Description */}
          {product.description && (
            <div className="bg-[#16161A] rounded-xl border border-[#2A2A30] overflow-hidden">
              <button
                onClick={() => toggleSection('description')}
                className="w-full px-4 py-4 flex items-center justify-between"
              >
                <span className="font-medium text-white">
                  {language === 'ru' ? 'Описание' : 'Description'}
                </span>
                <svg
                  className={`w-5 h-5 text-[#5C5C66] transition-transform ${expandedSection === 'description' ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {expandedSection === 'description' && (
                <div className="px-4 pb-4 pt-0 border-t border-[#2A2A30]">
                  <p className="text-sm text-[#A0A0A8] pt-4 leading-relaxed whitespace-pre-line">
                    {product.description}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Seller - collapsed by default */}
          <div className="bg-[#16161A] rounded-xl border border-[#2A2A30] overflow-hidden">
            <button
              onClick={() => toggleSection('seller')}
              className="w-full px-4 py-4 flex items-center justify-between"
            >
              <span className="font-medium text-white">
                {language === 'ru' ? 'Продавец' : 'Seller'}
              </span>
              <svg
                className={`w-5 h-5 text-[#5C5C66] transition-transform ${expandedSection === 'seller' ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {expandedSection === 'seller' && (
              <div className="px-4 pb-4 pt-0 border-t border-[#2A2A30]">
                <div className="flex items-center gap-3 pt-4">
                  <div className="w-10 h-10 rounded-full bg-[#2A2A30] flex items-center justify-center">
                    <span className="text-white font-medium">
                      {product.seller.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-white">{product.seller.name}</p>
                    <p className="text-xs text-[#5C5C66]">
                      {language === 'ru' ? 'Проверенный продавец' : 'Verified seller'}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Similar Products */}
        {recommendedProducts.length > 0 && (
          <div className="mb-6">
            <h3 className="text-base font-medium text-white mb-4">
              {language === 'ru' ? 'Похожие товары' : 'Similar'}
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {recommendedProducts.slice(0, 2).map((recProduct) => (
                <ProductCard key={recProduct._id} product={recProduct} />
              ))}
            </div>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  )
}
