'use client'

import { useAppStore } from '@/lib/store'

export type SellerBadgeType = 'new' | 'trusted' | 'verified' | 'top_seller' | 'high_volume' | 'risky'

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
  animation?: string
}> = {
  new: {
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
      </svg>
    ),
    label: { ru: 'Новичок', en: 'New' },
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500/10',
    description: { ru: 'Новый продавец', en: 'New seller' },
    animation: 'animate-pulse'
  },
  trusted: {
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"/>
      </svg>
    ),
    label: { ru: 'Надежный', en: 'Trusted' },
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    description: { ru: 'Проверенный продавец', en: 'Trusted seller' },
    animation: 'animate-badge-glow-blue'
  },
  verified: {
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M8.603 3.799A4.49 4.49 0 0112 2.25c1.357 0 2.573.6 3.397 1.549a4.49 4.49 0 013.498 1.307 4.491 4.491 0 011.307 3.497A4.49 4.49 0 0121.75 12a4.49 4.49 0 01-1.549 3.397 4.491 4.491 0 01-1.307 3.497 4.491 4.491 0 01-3.497 1.307A4.49 4.49 0 0112 21.75a4.49 4.49 0 01-3.397-1.549 4.49 4.49 0 01-3.498-1.306 4.491 4.491 0 01-1.307-3.498A4.49 4.49 0 012.25 12c0-1.357.6-2.573 1.549-3.397a4.49 4.49 0 011.307-3.497 4.49 4.49 0 013.497-1.307z"/>
        <path fill="white" d="M15.61 10.186a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z"/>
      </svg>
    ),
    label: { ru: 'Верифицирован', en: 'Verified' },
    color: 'text-cyan-500',
    bgColor: 'bg-cyan-500/10',
    description: { ru: 'Личность подтверждена', en: 'Identity verified' },
    animation: 'animate-badge-glow-cyan'
  },
  top_seller: {
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
      </svg>
    ),
    label: { ru: 'Топ', en: 'Top' },
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
    description: { ru: 'Топ-продавец', en: 'Top seller' },
    animation: 'animate-badge-glow-amber'
  },
  high_volume: {
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z"/>
      </svg>
    ),
    label: { ru: '100+', en: '100+' },
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
    description: { ru: '100+ продаж', en: '100+ sales' },
    animation: 'animate-badge-glow-purple'
  },
  risky: {
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
      </svg>
    ),
    label: { ru: 'Риск', en: 'Risky' },
    color: 'text-red-500',
    bgColor: 'bg-red-500/10',
    description: { ru: 'Проблемы с заказами', en: 'Order issues' },
    animation: 'animate-badge-pulse-red'
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
    sm: 'text-[10px]',
    md: 'text-[11px]',
    lg: 'text-[12px]'
  }

  const paddingClasses = {
    sm: 'px-1.5 py-0.5 gap-1',
    md: 'px-2 py-1 gap-1',
    lg: 'px-2.5 py-1 gap-1.5'
  }

  if (showLabel) {
    return (
      <span
        className={`inline-flex items-center ${config.bgColor} ${paddingClasses[size]} rounded-full ${config.animation || ''}`}
        title={config.description[language]}
      >
        <span className={`${sizeClasses[size]} ${config.color}`}>
          {config.icon}
        </span>
        <span className={`${labelSizeClasses[size]} ${config.color} font-medium`}>
          {config.label[language]}
        </span>
      </span>
    )
  }

  return (
    <span
      className={`${sizeClasses[size]} ${config.color} inline-flex ${config.animation || ''}`}
      title={`${config.label[language]}: ${config.description[language]}`}
    >
      {config.icon}
    </span>
  )
}

// Multiple badges display
interface SellerBadgesProps {
  badges: SellerBadgeType[]
  size?: 'sm' | 'md' | 'lg'
  showLabels?: boolean
  maxVisible?: number
}

export function SellerBadges({ badges, size = 'md', showLabels = false, maxVisible = 5 }: SellerBadgesProps) {
  const visibleBadges = badges.filter(b => b !== 'risky').slice(0, maxVisible)

  if (visibleBadges.length === 0) return null

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {visibleBadges.map((badge) => (
        <SellerBadge key={badge} badge={badge} size={size} showLabel={showLabels} />
      ))}
    </div>
  )
}

// Seller rating display
interface SellerRatingProps {
  rating: number
  ratingCount?: number
  size?: 'sm' | 'md' | 'lg'
}

export function SellerRating({ rating, ratingCount, size = 'md' }: SellerRatingProps) {
  const { language } = useAppStore()
  const percentage = Math.round(rating)

  const getColor = () => {
    if (rating >= 90) return 'text-app-success'
    if (rating >= 70) return 'text-amber-500'
    if (rating >= 50) return 'text-orange-500'
    return 'text-tg-destructive'
  }

  const sizeClasses = {
    sm: 'text-[12px]',
    md: 'text-[13px]',
    lg: 'text-[14px]'
  }

  const iconSizes = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  }

  return (
    <div className="flex items-center gap-1">
      <svg className={`${iconSizes[size]} ${getColor()}`} fill="currentColor" viewBox="0 0 20 20">
        <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
      </svg>
      <span className={`${sizeClasses[size]} font-semibold ${getColor()}`}>
        {percentage}%
      </span>
      {ratingCount !== undefined && (
        <span className={`${sizeClasses[size]} text-tg-hint`}>
          ({ratingCount})
        </span>
      )}
    </div>
  )
}
