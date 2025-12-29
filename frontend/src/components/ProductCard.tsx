'use client'

import { Product } from '@/types'
import { useAppStore } from '@/lib/store'
import { useRouter } from 'next/navigation'
import { formatPrice } from '@/lib/currency'
import { t } from '@/lib/i18n'
import { useToast } from '@/components/Toast'
import { hapticImpact, hapticNotification } from '@/lib/telegram'

interface ProductCardProps {
  product: Product
  onClick?: () => void
}

export default function ProductCard({ product, onClick }: ProductCardProps) {
  const router = useRouter()
  const { toggleFavorite, isFavorite, language, currency, addToCart } = useAppStore()
  const toast = useToast()
  const favorite = isFavorite(product._id)

  // Check if product has auto-delivery (has delivery keys)
  const hasAutoDelivery = (product as any).deliveryType === 'auto'

  // Sales count (mock if not available)
  const salesCount = (product as any).salesCount || 0

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation()
    hapticNotification('success')
    addToCart({
      productId: product._id,
      productName: product.name,
      productImage: product.images[0] || '/placeholder.jpg',
      price: product.price,
      quantity: 1
    })
    toast.show(language === 'ru' ? 'Добавлено в корзину' : 'Added to cart', 'success')
  }

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    hapticImpact('light')
    toggleFavorite(product._id)
  }

  const handleClick = () => {
    if (onClick) {
      onClick()
    } else {
      router.push(`/product/${product._id}`)
    }
  }

  // Format seller rating (convert 5-point to percentage if needed)
  const sellerRating = product.seller.rating
  const displayRating = sellerRating > 5 ? sellerRating : Math.round(sellerRating * 20)

  return (
    <div
      onClick={handleClick}
      className="bg-light-card dark:bg-dark-card rounded-2xl overflow-hidden cursor-pointer hover:opacity-90 transition-opacity border border-light-border dark:border-dark-border"
    >
      <div className="relative aspect-square">
        <img
          src={product.images[0] || '/placeholder.jpg'}
          alt={product.name}
          className="w-full h-full object-cover"
        />

        {/* Favorite button */}
        <button
          onClick={handleFavoriteClick}
          className="absolute top-3 right-3 w-9 h-9 bg-black/30 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-black/40 transition-colors"
        >
          <svg
            className={`w-5 h-5 ${favorite ? 'fill-pink-500 text-pink-500' : 'fill-none text-white'}`}
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
            />
          </svg>
        </button>

        {/* Top left badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5">
          {/* Auto-delivery badge */}
          {hasAutoDelivery && (
            <div className="flex items-center gap-1 bg-yellow-500 px-2 py-0.5 rounded-full text-xs text-black font-medium">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span>{language === 'ru' ? 'Мгновенно' : 'Instant'}</span>
            </div>
          )}

          {/* Guarantee badge */}
          {product.condition === 'new' && (
            <div className="bg-green-500 px-2 py-0.5 rounded-full text-xs text-white font-medium">
              {language === 'ru' ? 'Гарантия' : 'Warranty'}
            </div>
          )}
        </div>

        {/* Sales count badge - bottom left */}
        {salesCount > 0 && (
          <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded-full text-xs text-white">
            {salesCount}+ {language === 'ru' ? 'продано' : 'sold'}
          </div>
        )}
      </div>

      <div className="p-3">
        {/* Product name */}
        <h3 className="text-sm font-medium mb-1 text-light-text dark:text-dark-text line-clamp-2 leading-tight">
          {product.name}
        </h3>

        {/* Price row */}
        <div className="flex items-baseline gap-2 mb-2">
          <p className="text-lg font-bold text-light-text dark:text-dark-text">
            {formatPrice(product.price, currency)}
          </p>
          {product.oldPrice && product.oldPrice > product.price && (
            <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary line-through">
              {formatPrice(product.oldPrice, currency)}
            </p>
          )}
        </div>

        {/* Seller info with rating */}
        <div className="flex items-center gap-2 mb-3">
          <img
            src={product.seller.avatar || '/default-avatar.png'}
            alt={product.seller.name}
            className="w-5 h-5 rounded-full"
          />
          <span className="text-xs text-light-text-secondary dark:text-dark-text-secondary truncate flex-1">
            {product.seller.name}
          </span>
          {/* Seller rating as percentage */}
          <div className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-medium ${
            displayRating >= 90
              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
              : displayRating >= 70
              ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
              : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
          }`}>
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
            </svg>
            <span>{displayRating}%</span>
          </div>
        </div>

        {/* Buy and Cart Buttons */}
        <div className="flex gap-2">
          <button
            onClick={handleAddToCart}
            className="w-9 h-9 flex items-center justify-center bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border rounded-lg hover:border-accent-cyan transition-colors flex-shrink-0"
          >
            <svg className="w-4 h-4 text-light-text dark:text-dark-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              router.push(`/checkout?productId=${product._id}`)
            }}
            className="flex-1 bg-accent-cyan hover:bg-accent-cyan/90 text-white font-medium py-2 rounded-lg transition-colors text-sm"
          >
            {t('buy', language)}
          </button>
        </div>
      </div>
    </div>
  )
}
