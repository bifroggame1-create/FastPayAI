'use client'

import { Product } from '@/types'
import { useAppStore } from '@/lib/store'
import { useRouter } from 'next/navigation'
import { formatPrice } from '@/lib/currency'
import ProductCover from './ProductCover'

interface ProductCardProps {
  product: Product
  onClick?: () => void
}

/**
 * ProductCard - Minimal, premium product card
 *
 * Design principles:
 * - One clear CTA (Buy button)
 * - Single optional indicator (Instant OR Protected)
 * - No seller info, no ratings, no favorites, no cart icon
 * - Clean typography hierarchy
 * - Generous spacing
 */
export default function ProductCard({ product, onClick }: ProductCardProps) {
  const router = useRouter()
  const { language, currency } = useAppStore()

  // Determine single indicator: Instant delivery OR Escrow protected
  const hasAutoDelivery = (product as any).deliveryType === 'auto'

  const handleClick = () => {
    if (onClick) {
      onClick()
    } else {
      router.push(`/product/${product._id}`)
    }
  }

  const handleBuyClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    router.push(`/product/${product._id}`)
  }

  // Short descriptor from category or condition
  const descriptor = product.category
    ? product.category.charAt(0).toUpperCase() + product.category.slice(1)
    : undefined

  return (
    <div
      onClick={handleClick}
      className="bg-[#16161A] rounded-xl overflow-hidden cursor-pointer transition-all duration-200 border border-[#2A2A30] hover:border-[#3A3A40]"
    >
      {/* Product Cover Image */}
      <div className="relative">
        <ProductCover
          src={product.images[0] || '/placeholder.jpg'}
          alt={product.name}
          className="rounded-t-xl rounded-b-none"
        />

        {/* Single subtle indicator */}
        {hasAutoDelivery && (
          <div className="absolute bottom-3 left-3 flex items-center gap-1.5 bg-[#0D0D0F]/80 backdrop-blur-sm px-2.5 py-1 rounded-md">
            <svg className="w-3.5 h-3.5 text-[#00D4AA]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span className="text-xs text-[#A0A0A8] font-medium">
              {language === 'ru' ? 'Мгновенно' : 'Instant'}
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Product name */}
        <h3 className="text-sm font-medium text-white line-clamp-2 leading-snug mb-1">
          {product.name}
        </h3>

        {/* Short descriptor */}
        {descriptor && (
          <p className="text-xs text-[#5C5C66] mb-3">
            {descriptor}
          </p>
        )}

        {/* Price */}
        <p className="text-lg font-bold text-white mb-4">
          {formatPrice(product.price, currency)}
        </p>

        {/* Single CTA */}
        <button
          onClick={handleBuyClick}
          className="w-full bg-[#00D4AA] hover:bg-[#00E5BB] text-[#0D0D0F] font-semibold py-2.5 rounded-lg transition-colors text-sm"
        >
          {language === 'ru' ? 'Купить' : 'Buy'}
        </button>
      </div>
    </div>
  )
}
