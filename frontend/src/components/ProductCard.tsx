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

  const hasAutoDelivery = (product as any).deliveryType === 'auto'
  const salesCount = (product as any).salesCount || 0
  const sellerRating = product.seller.rating
  const displayRating = sellerRating > 5 ? sellerRating : Math.round(sellerRating * 20)

  const savingsPercent = product.oldPrice && product.oldPrice > product.price
    ? Math.round((1 - product.price / product.oldPrice) * 100)
    : 0

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

  const handleBuyClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    router.push(`/checkout?productId=${product._id}`)
  }

  return (
    <div
      onClick={handleClick}
      className="bg-tg-secondary-bg rounded-tg overflow-hidden cursor-pointer active:scale-[0.98] transition-transform"
    >
      {/* Image Section */}
      <div className="relative aspect-square">
        <img
          src={product.images[0] || '/placeholder.jpg'}
          alt={product.name}
          className="w-full h-full object-cover"
        />

        {/* Favorite */}
        <button
          onClick={handleFavoriteClick}
          className="absolute top-2 right-2 w-8 h-8 bg-black/30 backdrop-blur-sm rounded-full flex items-center justify-center active:scale-90 transition-transform"
        >
          <svg
            className={`w-4 h-4 ${favorite ? 'fill-red-500 text-red-500' : 'fill-none text-white'}`}
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

        {/* Badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {hasAutoDelivery && (
            <div className="flex items-center gap-1 px-2 py-1 bg-tg-button rounded-tg-sm text-[11px] font-medium text-white">
              <span>⚡</span>
              <span>{language === 'ru' ? 'Мгновенно' : 'Instant'}</span>
            </div>
          )}
          {savingsPercent > 0 && (
            <div className="px-2 py-1 bg-app-success rounded-tg-sm text-[11px] font-medium text-white">
              -{savingsPercent}%
            </div>
          )}
        </div>

        {/* Sales count */}
        {salesCount > 0 && (
          <div className="absolute bottom-2 left-2 bg-black/40 backdrop-blur-sm px-2 py-1 rounded-tg-sm text-[11px] text-white">
            {salesCount}+ {language === 'ru' ? 'продаж' : 'sales'}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-3">
        {/* Name */}
        <h3 className="text-[13px] text-tg-text font-medium line-clamp-2 leading-snug mb-2">
          {product.name}
        </h3>

        {/* Price */}
        <div className="mb-3">
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-bold text-tg-text">
              {formatPrice(product.price, currency)}
            </span>
            {product.oldPrice && product.oldPrice > product.price && (
              <span className="text-xs text-tg-hint line-through">
                {formatPrice(product.oldPrice, currency)}
              </span>
            )}
          </div>
        </div>

        {/* Seller */}
        <div className="flex items-center gap-2 mb-3">
          <img
            src={product.seller.avatar || '/default-avatar.png'}
            alt={product.seller.name}
            className="w-5 h-5 rounded-full"
          />
          <span className="text-[12px] text-tg-hint truncate flex-1">
            {product.seller.name}
          </span>
          <div className={`text-[11px] font-medium ${
            displayRating >= 90 ? 'text-app-success' : displayRating >= 70 ? 'text-yellow-500' : 'text-tg-destructive'
          }`}>
            {displayRating}%
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={handleAddToCart}
            className="w-10 h-10 flex items-center justify-center bg-tg-bg rounded-tg-sm active:scale-95 transition-transform"
          >
            <svg className="w-5 h-5 text-tg-hint" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </button>
          <button
            onClick={handleBuyClick}
            className="flex-1 bg-tg-button text-tg-button-text font-semibold py-2.5 rounded-tg-sm active:opacity-80 transition-opacity text-[14px]"
          >
            {t('buy', language)}
          </button>
        </div>
      </div>
    </div>
  )
}
