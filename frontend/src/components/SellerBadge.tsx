'use client'

import { useAppStore } from '@/lib/store'

export type SellerBadgeType = 'new' | 'trusted' | 'verified' | 'top_seller' | 'high_volume'

interface SellerBadgeProps {
  badge: SellerBadgeType
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
}

const badgeConfig: Record<SellerBadgeType, {
  icon: React.ReactNode
  label: { ru: string; en: string }
  color: string
  bgColor: string
  description: { ru: string; en: string }
}> = {
  new: {
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
      </svg>
    ),
    label: { ru: 'Новичок', en: 'Newcomer' },
    color: 'text-gray-600 dark:text-gray-400',
    bgColor: 'bg-gray-100 dark:bg-gray-800',
    description: { ru: 'Новый продавец на платформе', en: 'New seller on the platform' }
  },
  trusted: {
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"/>
      </svg>
    ),
    label: { ru: 'Надежный', en: 'Trusted' },
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-900/30',
    description: { ru: 'Проверенный продавец с хорошей историей', en: 'Verified seller with good history' }
  },
  verified: {
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M8.603 3.799A4.49 4.49 0 0112 2.25c1.357 0 2.573.6 3.397 1.549a4.49 4.49 0 013.498 1.307 4.491 4.491 0 011.307 3.497A4.49 4.49 0 0121.75 12a4.49 4.49 0 01-1.549 3.397 4.491 4.491 0 01-1.307 3.497 4.491 4.491 0 01-3.497 1.307A4.49 4.49 0 0112 21.75a4.49 4.49 0 01-3.397-1.549 4.49 4.49 0 01-3.498-1.306 4.491 4.491 0 01-1.307-3.498A4.49 4.49 0 012.25 12c0-1.357.6-2.573 1.549-3.397a4.49 4.49 0 011.307-3.497 4.49 4.49 0 013.497-1.307zm7.007 6.387a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z"/>
      </svg>
    ),
    label: { ru: 'Верифицирован', en: 'Verified' },
    color: 'text-cyan-500',
    bgColor: 'bg-cyan-50 dark:bg-cyan-900/30',
    description: { ru: 'Личность продавца подтверждена', en: 'Seller identity confirmed' }
  },
  top_seller: {
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
      </svg>
    ),
    label: { ru: 'Топ-продавец', en: 'Top Seller' },
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-50 dark:bg-yellow-900/30',
    description: { ru: 'Один из лучших продавцов платформы', en: 'One of the top sellers on the platform' }
  },
  high_volume: {
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z"/>
      </svg>
    ),
    label: { ru: 'Большой объем', en: 'High Volume' },
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-50 dark:bg-purple-900/30',
    description: { ru: 'Более 100 успешных продаж', en: 'Over 100 successful sales' }
  }
}

export default function SellerBadge({ badge, size = 'md', showLabel = false }: SellerBadgeProps) {
  const { language } = useAppStore()
  const config = badgeConfig[badge]

  if (!config) return null

  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  }

  const labelSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  }

  const paddingClasses = {
    sm: 'px-1.5 py-0.5',
    md: 'px-2 py-1',
    lg: 'px-3 py-1.5'
  }

  if (showLabel) {
    return (
      <div
        className={`inline-flex items-center gap-1 ${config.bgColor} ${paddingClasses[size]} rounded-full`}
        title={config.description[language]}
      >
        <span className={`${sizeClasses[size]} ${config.color}`}>
          {config.icon}
        </span>
        <span className={`${labelSizeClasses[size]} ${config.color} font-medium`}>
          {config.label[language]}
        </span>
      </div>
    )
  }

  return (
    <span
      className={`${sizeClasses[size]} ${config.color} inline-block`}
      title={`${config.label[language]}: ${config.description[language]}`}
    >
      {config.icon}
    </span>
  )
}

// Component to display multiple badges
interface SellerBadgesProps {
  badges: SellerBadgeType[]
  size?: 'sm' | 'md' | 'lg'
  showLabels?: boolean
  maxVisible?: number
}

export function SellerBadges({ badges, size = 'md', showLabels = false, maxVisible = 5 }: SellerBadgesProps) {
  // Filter out 'risky' badge as it's internal
  const visibleBadges = badges.filter(b => b !== 'risky' as any).slice(0, maxVisible)

  if (visibleBadges.length === 0) return null

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {visibleBadges.map((badge) => (
        <SellerBadge key={badge} badge={badge} size={size} showLabel={showLabels} />
      ))}
    </div>
  )
}

// Seller rating display with stars
interface SellerRatingProps {
  rating: number // 0-100 score
  ratingCount?: number
  size?: 'sm' | 'md' | 'lg'
}

export function SellerRating({ rating, ratingCount, size = 'md' }: SellerRatingProps) {
  const { language } = useAppStore()

  // Convert 0-100 score to percentage for display
  const percentage = Math.round(rating)

  // Determine color based on rating
  const getColor = () => {
    if (rating >= 90) return 'text-green-500'
    if (rating >= 70) return 'text-yellow-500'
    if (rating >= 50) return 'text-orange-500'
    return 'text-red-500'
  }

  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg'
  }

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  }

  return (
    <div className="flex items-center gap-1.5">
      <svg className={`${iconSizes[size]} ${getColor()}`} fill="currentColor" viewBox="0 0 20 20">
        <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
      </svg>
      <span className={`${sizeClasses[size]} font-semibold ${getColor()}`}>
        {percentage}%
      </span>
      {ratingCount !== undefined && (
        <span className={`${sizeClasses[size]} text-light-text-secondary dark:text-dark-text-secondary`}>
          ({ratingCount} {language === 'ru' ? 'оценок' : 'ratings'})
        </span>
      )}
    </div>
  )
}
