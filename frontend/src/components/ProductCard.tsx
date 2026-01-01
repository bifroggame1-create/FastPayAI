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
  featured?: boolean
}

export default function ProductCard({ product, onClick, featured }: ProductCardProps) {
  const router = useRouter()
  const { toggleFavorite, isFavorite, language, currency, addToCart } = useAppStore()
  const toast = useToast()
  const favorite = isFavorite(product._id)

  const hasAutoDelivery = (product as any).deliveryType === 'auto'
  const salesCount = (product as any).salesCount || 0
  const sellerRating = product.seller.rating
  const displayRating = sellerRating > 5 ? sellerRating : Math.round(sellerRating * 20)

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

  // Featured card style (for main offer)
  if (featured) {
    return (
      <div
        onClick={handleClick}
        className="relative bg-gradient-to-br from-[#4789F4] to-[#6BA3FF] rounded-3xl p-5 cursor-pointer overflow-hidden group"
        style={{ boxShadow: '0 10px 40px -10px rgba(71, 137, 244, 0.4)' }}
      >
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-20 h-20 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />

        {/* Badge */}
        <div className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full mb-3">
          <span className="text-yellow-300">⭐</span>
          <span className="text-white text-xs font-medium">
            {language === 'ru' ? 'Предложение дня' : 'Offer of the day'}
          </span>
        </div>

        {/* Content */}
        <h3 className="text-white text-xl font-bold mb-1">{product.name}</h3>
        <p className="text-white/70 text-sm mb-3">
          {hasAutoDelivery
            ? (language === 'ru' ? 'Мгновенная доставка' : 'Instant delivery')
            : (language === 'ru' ? 'Доставка до 30 мин' : 'Delivery ~30 min')
          }
        </p>
        <p className="text-white text-2xl font-bold">{formatPrice(product.price, currency)}</p>

        {/* Product image */}
        <img
          src={product.images[0] || '/placeholder.jpg'}
          alt={product.name}
          className="absolute bottom-0 right-0 w-28 h-28 object-contain opacity-90 group-hover:scale-105 transition-transform"
        />
      </div>
    )
  }

  // Regular card - soft UI style
  return (
    <div
      onClick={handleClick}
      className="bg-white rounded-2xl overflow-hidden cursor-pointer group transition-all duration-200 hover:-translate-y-1"
      style={{ boxShadow: '0 4px 20px -4px rgba(0, 0, 0, 0.08)' }}
    >
      {/* Image Section */}
      <div className="relative aspect-square bg-[#F8F9FC]">
        <img
          src={product.images[0] || '/placeholder.jpg'}
          alt={product.name}
          className="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-300"
        />

        {/* Favorite */}
        <button
          onClick={handleFavoriteClick}
          className="absolute top-3 right-3 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-md transition-transform hover:scale-110"
        >
          <svg
            className={`w-4 h-4 ${favorite ? 'fill-[#FD6086] text-[#FD6086]' : 'fill-none text-gray-400'}`}
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

        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5">
          {hasAutoDelivery && (
            <div className="flex items-center gap-1 bg-[#4789F4] px-2 py-1 rounded-lg text-[10px] font-semibold text-white">
              ⚡ {language === 'ru' ? 'Мгновенно' : 'Instant'}
            </div>
          )}
          {product.condition === 'new' && (
            <div className="flex items-center gap-1 bg-emerald-500 px-2 py-1 rounded-lg text-[10px] font-semibold text-white">
              🛡 {language === 'ru' ? 'Гарантия' : 'Warranty'}
            </div>
          )}
        </div>
      </div>

      {/* Content Section */}
      <div className="p-4">
        {/* Product name */}
        <h3 className="text-sm font-medium text-gray-800 line-clamp-2 leading-snug mb-2 min-h-[40px]">
          {product.name}
        </h3>

        {/* Meta info pills */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          <div className="flex items-center gap-1 bg-[#F0F4FF] px-2 py-1 rounded-lg">
            <span className="text-[10px]">📍</span>
            <span className="text-[10px] text-[#4789F4] font-medium">
              {salesCount > 0 ? `${salesCount}+ ${language === 'ru' ? 'продаж' : 'sold'}` : (language === 'ru' ? 'Новинка' : 'New')}
            </span>
          </div>
          <div className="flex items-center gap-1 bg-[#FFF4F0] px-2 py-1 rounded-lg">
            <span className="text-[10px]">⭐</span>
            <span className="text-[10px] text-[#FD6086] font-medium">{displayRating}%</span>
          </div>
        </div>

        {/* Price */}
        <div className="flex items-baseline gap-2 mb-3">
          <p className="text-xl font-bold text-gray-900">
            {formatPrice(product.price, currency)}
          </p>
          {product.oldPrice && product.oldPrice > product.price && (
            <p className="text-xs text-gray-400 line-through">
              {formatPrice(product.oldPrice, currency)}
            </p>
          )}
        </div>

        {/* CTA Button */}
        <button
          onClick={handleBuyClick}
          className="w-full bg-[#FD6086] hover:bg-[#E54D73] text-white font-semibold py-3 rounded-xl transition-colors text-sm"
          style={{ boxShadow: '0 4px 14px -4px rgba(253, 96, 134, 0.4)' }}
        >
          {t('buy', language)}
        </button>
      </div>
    </div>
  )
}
