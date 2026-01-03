'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Header from '@/components/Header'
import BottomNav from '@/components/BottomNav'
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
      <div className="min-h-screen bg-tg-bg pb-32">
        <Header showBack onBack={() => router.back()} />
        <ProductDetailSkeleton />
        <BottomNav />
      </div>
    )
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-tg-bg flex items-center justify-center">
        <p className="text-tg-hint">{language === 'ru' ? 'Товар не найден' : 'Product not found'}</p>
      </div>
    )
  }

  const hasAutoDelivery = (product as any).deliveryType === 'auto'
  const currentPrice = selectedVariant?.price || product.price
  const sellerRating = product.seller.rating
  const displayRating = sellerRating > 5 ? sellerRating : Math.round(sellerRating * 20)

  return (
    <div className="min-h-screen bg-tg-bg pb-32">
      <Header
        title={product.category.charAt(0).toUpperCase() + product.category.slice(1)}
        showBack
        onBack={() => router.back()}
      />

      {/* Image Gallery */}
      <div className="relative aspect-square bg-tg-secondary-bg">
        <img
          src={product.images[currentImageIndex] || '/placeholder.jpg'}
          alt={product.name}
          className="w-full h-full object-cover"
        />

        {/* Badges */}
        <div className="absolute top-4 left-4 flex flex-col gap-2">
          {hasAutoDelivery && (
            <div className="flex items-center gap-1.5 bg-tg-button px-3 py-1.5 rounded-tg-sm text-[12px] font-medium text-white">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span>{language === 'ru' ? 'Мгновенно' : 'Instant'}</span>
            </div>
          )}
        </div>

        {/* Favorite button */}
        <button
          onClick={() => {
            hapticImpact('light')
            toggleFavorite(product._id)
          }}
          className="absolute top-4 right-4 w-10 h-10 bg-black/30 backdrop-blur-sm rounded-full flex items-center justify-center active:scale-90 transition-transform"
        >
          <svg
            className={`w-5 h-5 ${isFavorite(product._id) ? 'fill-red-500 text-red-500' : 'fill-none text-white'}`}
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        </button>

        {product.images.length > 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
            {product.images.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentImageIndex(index)}
                className={`w-2 h-2 rounded-full transition-colors ${
                  index === currentImageIndex ? 'bg-white' : 'bg-white/50'
                }`}
              />
            ))}
          </div>
        )}
      </div>

      <div className="px-4 pt-4">
        {/* Price and Title */}
        <div className="mb-4">
          <div className="flex items-baseline gap-3 mb-1">
            <h1 className="text-2xl font-bold text-tg-text">{formatPrice(currentPrice, currency)}</h1>
            {product.oldPrice && product.oldPrice > currentPrice && (
              <span className="text-base text-tg-hint line-through">{formatPrice(product.oldPrice, currency)}</span>
            )}
          </div>
          <h2 className="text-[17px] font-semibold text-tg-text mb-2">{product.name}</h2>

          {reviewStats && reviewStats.count > 0 && (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <svg className="w-4 h-4 text-yellow-500 fill-current" viewBox="0 0 20 20">
                  <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                </svg>
                <span className="font-semibold text-tg-text">{reviewStats.average.toFixed(1)}</span>
              </div>
              <span className="text-[13px] text-tg-hint">
                {reviewStats.count} {language === 'ru' ? 'отзывов' : 'reviews'}
              </span>
            </div>
          )}
        </div>

        {/* What you get */}
        <div className="bg-tg-secondary-bg rounded-tg p-4 mb-4">
          <h3 className="font-semibold text-tg-text mb-3 text-[15px]">
            {language === 'ru' ? 'Что вы получите' : 'What you get'}
          </h3>
          <div className="space-y-2.5">
            <div className="flex items-center gap-2.5 text-[14px] text-tg-text">
              <svg className="w-4 h-4 text-app-success flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>{language === 'ru' ? 'Ключ активации / Аккаунт' : 'Activation key / Account'}</span>
            </div>
            <div className="flex items-center gap-2.5 text-[14px] text-tg-text">
              <svg className="w-4 h-4 text-app-success flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>{language === 'ru' ? 'Инструкция по активации' : 'Activation instructions'}</span>
            </div>
            {hasAutoDelivery && (
              <div className="flex items-center gap-2.5 text-[14px] text-tg-text">
                <svg className="w-4 h-4 text-tg-accent flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span>{language === 'ru' ? 'Мгновенно после оплаты' : 'Instant after payment'}</span>
              </div>
            )}
          </div>
        </div>

        {/* Variants */}
        {product.variants && product.variants.length > 0 && (
          <div className="bg-tg-secondary-bg rounded-tg p-4 mb-4">
            <h3 className="text-[13px] font-medium text-tg-section-header mb-3 uppercase">
              {language === 'ru' ? 'Выберите вариант' : 'Select variant'}
            </h3>
            <div className="flex flex-wrap gap-2">
              {product.variants.map((variant) => (
                <button
                  key={variant.id}
                  onClick={() => setSelectedVariant(variant)}
                  className={`px-4 py-2.5 rounded-tg-sm text-[14px] font-medium transition-colors active:scale-95 ${
                    selectedVariant?.id === variant.id
                      ? 'bg-tg-button text-white'
                      : 'bg-tg-bg text-tg-text'
                  }`}
                >
                  {variant.name} — {formatPrice(variant.price, currency)}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Description */}
        {product.description && (
          <div className="bg-tg-secondary-bg rounded-tg p-4 mb-4">
            <h3 className="font-semibold text-tg-text mb-3 text-[15px]">
              {language === 'ru' ? 'Описание' : 'Description'}
            </h3>
            <p className="text-[14px] text-tg-hint whitespace-pre-line leading-relaxed">
              {product.description}
            </p>
          </div>
        )}

        {/* Seller */}
        <div className="bg-tg-secondary-bg rounded-tg p-4 mb-4">
          <div className="flex items-center gap-3 mb-3">
            <img
              src={product.seller.avatar || '/default-avatar.png'}
              alt={product.seller.name}
              className="w-12 h-12 rounded-full"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold text-tg-text text-[15px]">{product.seller.name}</span>
                <svg className="w-4 h-4 text-tg-accent" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className={`inline-flex items-center gap-1 text-[12px] font-medium ${
                displayRating >= 90 ? 'text-app-success' : displayRating >= 70 ? 'text-yellow-500' : 'text-tg-destructive'
              }`}>
                <span>{displayRating}%</span>
                <span className="text-tg-hint">{language === 'ru' ? 'успешных' : 'success'}</span>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => router.push(`/seller/${product.seller.id}`)}
              className="flex-1 bg-tg-bg text-tg-text py-2.5 rounded-tg-sm text-[14px] font-medium active:opacity-80 border border-tg-separator"
            >
              {language === 'ru' ? 'Профиль' : 'Profile'}
            </button>
            <button
              onClick={handleContactSeller}
              className="flex-1 bg-tg-button text-white py-2.5 rounded-tg-sm text-[14px] font-medium active:opacity-80"
            >
              {language === 'ru' ? 'Написать' : 'Message'}
            </button>
          </div>
        </div>

        {/* Reviews */}
        {reviews.length > 0 && (
          <div className="bg-tg-secondary-bg rounded-tg p-4 mb-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-tg-text text-[15px]">
                {language === 'ru' ? 'Отзывы' : 'Reviews'}
              </h3>
              {reviewStats && reviewStats.count > 3 && (
                <span className="text-[13px] text-tg-accent">
                  {language === 'ru' ? 'Все' : 'All'} ({reviewStats.count})
                </span>
              )}
            </div>
            <div className="space-y-3">
              {reviews.map((review) => (
                <div key={review._id} className="pb-3 border-b border-tg-separator last:border-0 last:pb-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-[13px] text-tg-text">{review.userName}</span>
                    <div className="flex">
                      {[...Array(5)].map((_, i) => (
                        <svg key={i} className={`w-3 h-3 ${i < review.rating ? 'text-yellow-500' : 'text-gray-500'}`} fill="currentColor" viewBox="0 0 20 20">
                          <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                        </svg>
                      ))}
                    </div>
                  </div>
                  <p className="text-[13px] text-tg-hint">{review.text}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Action Bar */}
      <div className="fixed bottom-14 left-0 right-0 p-4 bg-tg-bg/95 backdrop-blur-sm border-t border-tg-separator">
        <div className="flex gap-3 items-center max-w-lg mx-auto">
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
            className="w-12 h-12 flex items-center justify-center bg-tg-secondary-bg rounded-tg-sm active:scale-95 transition-transform"
          >
            <svg className="w-6 h-6 text-tg-hint" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </button>

          <button
            onClick={() => {
              const params = new URLSearchParams({
                productId: product._id,
                ...(selectedVariant && { variantId: selectedVariant.id })
              })
              router.push(`/checkout?${params.toString()}`)
            }}
            className="flex-1 bg-tg-button text-white py-3.5 rounded-tg-sm font-semibold active:opacity-80 transition-opacity flex items-center justify-center gap-2 text-[15px]"
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
