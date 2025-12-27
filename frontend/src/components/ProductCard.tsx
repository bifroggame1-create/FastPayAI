'use client'

import { Product } from '@/types'
import { useAppStore } from '@/lib/store'
import { format } from 'date-fns/format'
import { ru } from 'date-fns/locale/ru'
import { useRouter } from 'next/navigation'

interface ProductCardProps {
  product: Product
  onClick?: () => void
}

export default function ProductCard({ product, onClick }: ProductCardProps) {
  const router = useRouter()
  const { toggleFavorite, isFavorite } = useAppStore()
  const favorite = isFavorite(product._id)

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    toggleFavorite(product._id)
  }

  const handleClick = () => {
    if (onClick) {
      onClick()
    } else {
      router.push(`/product/${product._id}`)
    }
  }

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
        <button
          onClick={handleFavoriteClick}
          className="absolute top-3 right-3 w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white/30 transition-colors"
        >
          <svg
            className={`w-6 h-6 ${favorite ? 'fill-pink-500 text-pink-500' : 'fill-none text-white'}`}
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
        {product.condition === 'new' && (
          <div className="absolute top-3 left-3 bg-black/80 dark:bg-dark-bg/80 backdrop-blur-sm px-3 py-1 rounded-full text-xs text-white">
            Гарантия
          </div>
        )}
      </div>

      <div className="p-4">
        <h3 className="text-base font-medium mb-1 text-light-text dark:text-dark-text line-clamp-2">{product.name}</h3>
        <p className="text-xl font-bold mb-3 text-light-text dark:text-dark-text">{product.price.toLocaleString('ru-RU')} ₽</p>

        <div className="flex items-center gap-2 mb-2">
          <img
            src={product.seller.avatar || '/default-avatar.png'}
            alt={product.seller.name}
            className="w-6 h-6 rounded-full"
          />
          <span className="text-sm text-light-text-secondary dark:text-dark-text-secondary truncate">{product.seller.name}</span>
          <div className="flex items-center gap-1 flex-shrink-0">
            <svg className="w-4 h-4 text-yellow-500 fill-current" viewBox="0 0 20 20">
              <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
            </svg>
            <span className="text-sm text-light-text-secondary dark:text-dark-text-secondary">{product.seller.rating}</span>
          </div>
        </div>

        <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary mb-3">
          {format(new Date(product.createdAt), 'd MMMM в HH:mm', { locale: ru })}
        </p>

        {/* Buy Button */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            router.push(`/checkout?productId=${product._id}`)
          }}
          className="w-full bg-accent-cyan hover:bg-accent-cyan/90 text-white font-medium py-2.5 rounded-lg transition-colors"
        >
          Купить
        </button>
      </div>
    </div>
  )
}
