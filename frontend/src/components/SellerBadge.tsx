'use client'

import { useAppStore } from '@/lib/store'
import dynamic from 'next/dynamic'

// Dynamically import Lottie to avoid SSR issues
const Lottie = dynamic(() => import('lottie-react'), { ssr: false })

// Import status icons for badges
import newSellerIcon from '../../public/status-icons/status-5.json'
import trustedIcon from '../../public/status-icons/status-4.json'
import verifiedIcon from '../../public/status-icons/status-3.json'
import topSellerIcon from '../../public/status-icons/status-1.json'
import highVolumeIcon from '../../public/status-icons/status-6.json'
import riskyIcon from '../../public/status-icons/status-7.json'

// Import new badge icons from Status folder
import vipIcon from '../../public/badge-icons/badge-1.json'
import busyIcon from '../../public/badge-icons/badge-2.json'
import offlineIcon from '../../public/badge-icons/badge-3.json'
import onHoldIcon from '../../public/badge-icons/badge-hold.json'

export type SellerBadgeType = 'new' | 'trusted' | 'verified' | 'top_seller' | 'high_volume' | 'risky' | 'vip' | 'busy' | 'offline' | 'on_hold'

interface SellerBadgeProps {
  badge: SellerBadgeType
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
}

const badgeConfig: Record<SellerBadgeType, {
  iconData: any // Lottie animation data
  label: { ru: string; en: string }
  color: string
  bgColor: string
  description: { ru: string; en: string }
  animation?: string
}> = {
  new: {
    iconData: newSellerIcon,
    label: { ru: 'Новичок', en: 'New' },
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500/10',
    description: { ru: 'Новый продавец', en: 'New seller' },
    animation: ''
  },
  trusted: {
    iconData: trustedIcon,
    label: { ru: 'Надежный', en: 'Trusted' },
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    description: { ru: 'Проверенный продавец', en: 'Trusted seller' },
    animation: ''
  },
  verified: {
    iconData: verifiedIcon,
    label: { ru: 'Верифицирован', en: 'Verified' },
    color: 'text-cyan-500',
    bgColor: 'bg-cyan-500/10',
    description: { ru: 'Личность подтверждена', en: 'Identity verified' },
    animation: ''
  },
  top_seller: {
    iconData: topSellerIcon,
    label: { ru: 'Топ', en: 'Top' },
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
    description: { ru: 'Топ-продавец', en: 'Top seller' },
    animation: ''
  },
  high_volume: {
    iconData: highVolumeIcon,
    label: { ru: '100+', en: '100+' },
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
    description: { ru: '100+ продаж', en: '100+ sales' },
    animation: ''
  },
  risky: {
    iconData: riskyIcon,
    label: { ru: 'Риск', en: 'Risky' },
    color: 'text-red-500',
    bgColor: 'bg-red-500/10',
    description: { ru: 'Проблемы с заказами', en: 'Order issues' },
    animation: ''
  },
  vip: {
    iconData: vipIcon,
    label: { ru: 'VIP', en: 'VIP' },
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-500/10',
    description: { ru: 'VIP продавец', en: 'VIP seller' },
    animation: ''
  },
  busy: {
    iconData: busyIcon,
    label: { ru: 'Занят', en: 'Busy' },
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
    description: { ru: 'Продавец занят', en: 'Seller is busy' },
    animation: ''
  },
  offline: {
    iconData: offlineIcon,
    label: { ru: 'Офлайн', en: 'Offline' },
    color: 'text-gray-500',
    bgColor: 'bg-gray-500/10',
    description: { ru: 'Продавец офлайн', en: 'Seller is offline' },
    animation: ''
  },
  on_hold: {
    iconData: onHoldIcon,
    label: { ru: 'На удержании', en: 'On Hold' },
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-600/10',
    description: { ru: 'Аккаунт на удержании', en: 'Account on hold' },
    animation: ''
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
        <span className={`${sizeClasses[size]}`}>
          <Lottie
            animationData={config.iconData}
            loop={true}
            style={{ width: '100%', height: '100%' }}
          />
        </span>
        <span className={`${labelSizeClasses[size]} ${config.color} font-medium`}>
          {config.label[language]}
        </span>
      </span>
    )
  }

  return (
    <span
      className={`${sizeClasses[size]} inline-flex ${config.animation || ''}`}
      title={`${config.label[language]}: ${config.description[language]}`}
    >
      <Lottie
        animationData={config.iconData}
        loop={true}
        style={{ width: '100%', height: '100%' }}
      />
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
