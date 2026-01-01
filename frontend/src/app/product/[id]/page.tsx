'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import BottomNav from '@/components/BottomNav'
import ProductCard from '@/components/ProductCard'
import { EscrowExplainer } from '@/components/TrustBanner'
import { ProductDetailSkeleton } from '@/components/Skeleton'
import { Product, ProductVariant, Review } from '@/types'
import { productsApi, chatApi, reviewsApi } from '@/lib/api'
import { useAppStore } from '@/lib/store'
import { getTelegramUser, hapticNotification, hapticImpact } from '@/lib/telegram'
import { useToast } from '@/components/Toast'
import { formatPrice } from '@/lib/currency'

export default function ProductDetailPage() {
  const params = useParams()
  const router = useRouter()
  const toast = useToast()
  const [product, setProduct] = useState<Product | null>(null)
  const [recommendedProducts, setRecommendedProducts] = useState<Product[]>([])
  const [reviews, setReviews] = useState<Review[]>([])
  const [reviewStats, setReviewStats] = useState<{ count: number; average: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null)
  const { toggleFavorite, isFavorite, addToCart, language, currency } = useAppStore()

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
      const recommended = allProducts.filter(p => p._id !== data._id).slice(0, 5)
      setRecommendedProducts(recommended)

      try {
        const [reviewsData, statsData] = await Promise.all([
          reviewsApi.getByProduct(params.id as string),
          reviewsApi.getStats(params.id as string)
        ])
        setReviews(reviewsData.slice(0, 3))
        setReviewStats(statsData)
      } catch {
        // Reviews might not exist
      }
    } catch (error) {
      console.error('Error loading product:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleContactSeller = async () => {
    if (!product) return

    try {
      const user = getTelegramUser()
      const buyerId = user?.id || 'anonymous'
      const productId = product._id || (params.id as string)

      if (!productId) {
        toast.show(language === 'ru' ? 'Не удалось создать чат' : 'Failed to create chat', 'error')
        return
      }

      const response = await chatApi.createChat({
        buyerId,
        sellerId: product.seller.id,
        productId,
        productName: product.name
      })

      if (response.success && response.chat) {
        router.push(`/chats/${response.chat.id}`)
      } else {
        toast.show(language === 'ru' ? 'Не удалось создать чат' : 'Failed to create chat', 'error')
      }
    } catch (error) {
      console.error('Error creating chat:', error)
      toast.show(language === 'ru' ? 'Ошибка при создании чата' : 'Error creating chat', 'error')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FBFAFE] pb-32">
        <ProductDetailSkeleton />
        <BottomNav />
      </div>
    )
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-[#FBFAFE] flex items-center justify-center">
        <p className="text-gray-500">
          {language === 'ru' ? 'Товар не найден' : 'Product not found'}
        </p>
      </div>
    )
  }

  const hasAutoDelivery = (product as any).deliveryType === 'auto'
  const currentPrice = selectedVariant?.price || product.price
  const sellerRating = product.seller.rating
  const displayRating = sellerRating > 5 ? sellerRating : Math.round(sellerRating * 20)
  const favorite = isFavorite(product._id)

  return (
    <div className="min-h-screen bg-[#FBFAFE] pb-36">
      {/* Header */}
      <div className="sticky top-0 z-30 px-4 py-3 flex items-center justify-between bg-[#FBFAFE]/80 backdrop-blur-lg">
        <button
          onClick={() => router.back()}
          className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm"
        >
          <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <button
          onClick={() => {
            hapticImpact('light')
            toggleFavorite(product._id)
          }}
          className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm"
        >
          <svg
            className={`w-5 h-5 ${favorite ? 'fill-[#FD6086] text-[#FD6086]' : 'fill-none text-gray-400'}`}
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
            />
          </svg>
        </button>
      </div>

      {/* Image Gallery */}
      <div className="relative mx-5 rounded-3xl overflow-hidden bg-white mb-5" style={{ boxShadow: '0 4px 20px -4px rgba(0, 0, 0, 0.08)' }}>
        <div className="aspect-square bg-[#F8F9FC] relative">
          <img
            src={product.images[currentImageIndex] || '/placeholder.jpg'}
            alt={product.name}
            className="w-full h-full object-contain p-8"
          />

          {/* Badges */}
          <div className="absolute top-4 left-4 flex flex-col gap-2">
            {hasAutoDelivery && (
              <div className="flex items-center gap-1.5 bg-[#4789F4] px-3 py-1.5 rounded-full text-xs font-semibold text-white shadow-lg">
                ⚡ {language === 'ru' ? 'Мгновенно' : 'Instant'}
              </div>
            )}
            {product.condition === 'new' && (
              <div className="flex items-center gap-1.5 bg-emerald-500 px-3 py-1.5 rounded-full text-xs font-semibold text-white shadow-lg">
                🛡 {language === 'ru' ? 'Гарантия' : 'Warranty'}
              </div>
            )}
          </div>
        </div>

        {/* Image dots */}
        {product.images.length > 1 && (
          <div className="flex justify-center gap-2 py-3">
            {product.images.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentImageIndex(index)}
                className={`w-2 h-2 rounded-full transition-all ${
                  index === currentImageIndex ? 'bg-[#FD6086] w-6' : 'bg-gray-300'
                }`}
              />
            ))}
          </div>
        )}
      </div>

      <div className="px-5 space-y-4">
        {/* Title & Price */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{product.name}</h1>
          <p className="text-sm text-gray-500 mb-3">{product.description?.slice(0, 100)}...</p>

          {/* Price Row */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">{language === 'ru' ? 'Цена' : 'Price'}</span>
            <span className="text-3xl font-bold text-gray-900">{formatPrice(currentPrice, currency)}</span>
            {product.oldPrice && product.oldPrice > currentPrice && (
              <span className="text-base text-gray-400 line-through">{formatPrice(product.oldPrice, currency)}</span>
            )}
          </div>
        </div>

        {/* Info Pills */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-2xl p-4 text-center" style={{ boxShadow: '0 4px 20px -4px rgba(0, 0, 0, 0.08)' }}>
            <div className="w-10 h-10 bg-[#F0F4FF] rounded-xl flex items-center justify-center mx-auto mb-2">
              <span className="text-lg">📍</span>
            </div>
            <p className="text-xs font-semibold text-gray-900">
              {hasAutoDelivery ? (language === 'ru' ? 'Мгновенно' : 'Instant') : '~30 мин'}
            </p>
            <p className="text-[10px] text-gray-500">{language === 'ru' ? 'Доставка' : 'Delivery'}</p>
          </div>
          <div className="bg-white rounded-2xl p-4 text-center" style={{ boxShadow: '0 4px 20px -4px rgba(0, 0, 0, 0.08)' }}>
            <div className="w-10 h-10 bg-[#FFF9E6] rounded-xl flex items-center justify-center mx-auto mb-2">
              <span className="text-lg">⭐</span>
            </div>
            <p className="text-xs font-semibold text-gray-900">{displayRating}%</p>
            <p className="text-[10px] text-gray-500">{language === 'ru' ? 'Успешных' : 'Success'}</p>
          </div>
          <div className="bg-white rounded-2xl p-4 text-center" style={{ boxShadow: '0 4px 20px -4px rgba(0, 0, 0, 0.08)' }}>
            <div className="w-10 h-10 bg-[#E8F5E9] rounded-xl flex items-center justify-center mx-auto mb-2">
              <span className="text-lg">✅</span>
            </div>
            <p className="text-xs font-semibold text-gray-900">{language === 'ru' ? 'Гарантия' : 'Warranty'}</p>
            <p className="text-[10px] text-gray-500">{language === 'ru' ? 'Защита' : 'Protected'}</p>
          </div>
        </div>

        {/* Variants */}
        {product.variants && product.variants.length > 0 && (
          <div className="bg-white rounded-2xl p-5" style={{ boxShadow: '0 4px 20px -4px rgba(0, 0, 0, 0.08)' }}>
            <h3 className="font-semibold text-gray-900 mb-3">
              {language === 'ru' ? 'Выберите вариант' : 'Select variant'}
            </h3>
            <div className="flex flex-wrap gap-2">
              {product.variants.map((variant) => (
                <button
                  key={variant.id}
                  onClick={() => setSelectedVariant(variant)}
                  className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    selectedVariant?.id === variant.id
                      ? 'bg-[#4789F4] text-white shadow-lg'
                      : 'bg-[#F8F9FC] text-gray-700 hover:bg-[#EEF2FF]'
                  }`}
                  style={selectedVariant?.id === variant.id ? { boxShadow: '0 4px 14px -4px rgba(71, 137, 244, 0.4)' } : {}}
                >
                  {variant.name} — {formatPrice(variant.price, currency)}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Seller Card */}
        <div className="bg-white rounded-2xl p-5" style={{ boxShadow: '0 4px 20px -4px rgba(0, 0, 0, 0.08)' }}>
          <div className="flex items-center gap-4 mb-4">
            <img
              src={product.seller.avatar || '/default-avatar.png'}
              alt={product.seller.name}
              className="w-14 h-14 rounded-full object-cover border-2 border-white shadow-md"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold text-gray-900">{product.seller.name}</span>
                <svg className="w-5 h-5 text-[#4789F4]" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-medium ${
                displayRating >= 90
                  ? 'bg-[#E8F5E9] text-emerald-700'
                  : displayRating >= 70
                  ? 'bg-[#FFF9E6] text-amber-700'
                  : 'bg-[#FFEBEE] text-red-700'
              }`}>
                ⭐ {displayRating}% {language === 'ru' ? 'успешных' : 'successful'}
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => router.push(`/seller/${product.seller.id}`)}
              className="flex-1 bg-[#F8F9FC] text-gray-700 py-3 rounded-xl text-sm font-medium hover:bg-[#EEF2FF] transition-colors"
            >
              {language === 'ru' ? 'Профиль' : 'Profile'}
            </button>
            <button
              onClick={handleContactSeller}
              className="flex-1 bg-[#F0F4FF] text-[#4789F4] py-3 rounded-xl text-sm font-medium hover:bg-[#E0EAFF] transition-colors"
            >
              {language === 'ru' ? 'Написать' : 'Message'}
            </button>
          </div>
        </div>

        {/* Reviews */}
        {reviews.length > 0 && (
          <div className="bg-white rounded-2xl p-5" style={{ boxShadow: '0 4px 20px -4px rgba(0, 0, 0, 0.08)' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">
                {language === 'ru' ? 'Отзывы' : 'Reviews'}
              </h3>
              {reviewStats && reviewStats.count > 3 && (
                <span className="text-sm text-[#4789F4] font-medium">
                  {language === 'ru' ? 'Все' : 'All'} ({reviewStats.count})
                </span>
              )}
            </div>
            <div className="space-y-4">
              {reviews.map((review) => (
                <div key={review._id} className="pb-4 border-b border-gray-100 last:border-0 last:pb-0">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 bg-[#F0F4FF] rounded-full flex items-center justify-center text-sm font-medium text-[#4789F4]">
                      {review.userName.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-medium text-sm text-gray-900">{review.userName}</span>
                    <div className="flex ml-auto">
                      {[...Array(5)].map((_, i) => (
                        <span key={i} className={`text-sm ${i < review.rating ? 'text-amber-400' : 'text-gray-200'}`}>★</span>
                      ))}
                    </div>
                  </div>
                  <p className="text-sm text-gray-600">{review.text}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Trust Section */}
        <EscrowExplainer variant="full" />

        {/* Similar Products */}
        {recommendedProducts.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {language === 'ru' ? 'Похожие товары' : 'Similar products'}
            </h3>
            <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 -mx-5 px-5">
              {recommendedProducts.map((recProduct) => (
                <div key={recProduct._id} className="flex-shrink-0 w-44">
                  <ProductCard product={recProduct} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Sticky Bottom Action Bar */}
      <div className="fixed bottom-16 left-0 right-0 p-4 bg-[#FBFAFE]/95 backdrop-blur-lg border-t border-gray-100 safe-area-bottom">
        <div className="flex gap-3 items-center">
          {/* Cart button */}
          <button
            onClick={() => {
              hapticNotification('success')
              addToCart({
                productId: product._id,
                productName: product.name,
                productImage: product.images[0] || '/placeholder.jpg',
                price: currentPrice,
                quantity: 1,
                variantId: selectedVariant?.id,
                variantName: selectedVariant?.name
              })
              toast.show(language === 'ru' ? 'Добавлено в корзину' : 'Added to cart', 'success')
            }}
            className="w-14 h-14 flex items-center justify-center bg-white border border-gray-200 rounded-2xl shadow-sm"
          >
            <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </button>

          {/* Buy button */}
          <button
            onClick={() => {
              const params = new URLSearchParams({
                productId: product._id,
                ...(selectedVariant && { variantId: selectedVariant.id })
              })
              router.push(`/checkout?${params.toString()}`)
            }}
            className="flex-1 bg-[#FD6086] text-white py-4 rounded-2xl font-semibold hover:bg-[#E54D73] transition-colors flex items-center justify-center gap-2"
            style={{ boxShadow: '0 8px 30px -8px rgba(253, 96, 134, 0.4)' }}
          >
            <span>{language === 'ru' ? 'Купить за' : 'Buy for'}</span>
            <span className="font-bold">{formatPrice(currentPrice, currency)}</span>
          </button>
        </div>
      </div>

      <BottomNav />
    </div>
  )
}
