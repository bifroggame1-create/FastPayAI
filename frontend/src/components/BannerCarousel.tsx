'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { hapticImpact } from '@/lib/telegram'
import { useAppStore } from '@/lib/store'
import dynamic from 'next/dynamic'

// Dynamically import Lottie to avoid SSR issues
const Lottie = dynamic(() => import('lottie-react'), { ssr: false })

// Import duck animation
import duckAnimation from '../../public/duck-stickers/duck-1.json'

interface Banner {
  id: string
  title: { ru: string; en: string }
  subtitle: { ru: string; en: string }
  icon?: string
  animation?: any
  gradient: string
  link: string
}

const banners: Banner[] = [
  {
    id: 'telegram-stars',
    title: { ru: 'Купить Telegram Stars', en: 'Buy Telegram Stars' },
    subtitle: { ru: 'Пополни звёзды за секунды', en: 'Top up stars in seconds' },
    animation: duckAnimation,
    gradient: 'from-purple-500 to-blue-500',
    link: '/stars'
  }
]

export default function BannerCarousel() {
  const { language } = useAppStore()
  const router = useRouter()
  const [currentIndex, setCurrentIndex] = useState(0)
  const [touchStart, setTouchStart] = useState(0)
  const [touchEnd, setTouchEnd] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  // Auto-scroll banners every 5 seconds
  useEffect(() => {
    if (banners.length <= 1) return

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % banners.length)
    }, 5000)

    return () => clearInterval(interval)
  }, [])

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX)
  }

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return

    const distance = touchStart - touchEnd
    const isLeftSwipe = distance > 50
    const isRightSwipe = distance < -50

    if (isLeftSwipe && currentIndex < banners.length - 1) {
      setCurrentIndex(currentIndex + 1)
      hapticImpact('light')
    }

    if (isRightSwipe && currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
      hapticImpact('light')
    }

    setTouchStart(0)
    setTouchEnd(0)
  }

  const handleBannerClick = (banner: Banner) => {
    hapticImpact('medium')
    router.push(banner.link)
  }

  if (banners.length === 0) return null

  return (
    <div className="px-4 pt-3 pb-2">
      <div
        ref={containerRef}
        className="relative overflow-hidden rounded-2xl"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Banners container */}
        <div
          className="flex transition-transform duration-300 ease-out"
          style={{ transform: `translateX(-${currentIndex * 100}%)` }}
        >
          {banners.map((banner) => (
            <button
              key={banner.id}
              onClick={() => handleBannerClick(banner)}
              className="w-full flex-shrink-0 active:scale-[0.98] transition-transform"
            >
              <div className={`relative bg-gradient-to-r ${banner.gradient} p-5 rounded-2xl overflow-hidden`}>
                {/* Content */}
                <div className="relative z-10 flex items-center gap-4">
                  {banner.animation ? (
                    <div className="w-16 h-16 flex-shrink-0">
                      <Lottie
                        animationData={banner.animation}
                        loop={true}
                        style={{ width: '100%', height: '100%' }}
                      />
                    </div>
                  ) : (
                    <div className="text-5xl">{banner.icon}</div>
                  )}
                  <div className="flex-1 text-left">
                    <h3 className="text-white text-[17px] font-semibold mb-1">
                      {banner.title[language]}
                    </h3>
                    <p className="text-white/90 text-[13px]">
                      {banner.subtitle[language]}
                    </p>
                  </div>
                  <div className="text-white/80">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>

                {/* Decorative elements */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16" />
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full -ml-12 -mb-12" />
              </div>
            </button>
          ))}
        </div>

        {/* Pagination dots */}
        {banners.length > 1 && (
          <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
            {banners.map((_, index) => (
              <button
                key={index}
                onClick={() => {
                  setCurrentIndex(index)
                  hapticImpact('light')
                }}
                className={`h-1.5 rounded-full transition-all ${
                  index === currentIndex
                    ? 'bg-white w-6'
                    : 'bg-white/40 w-1.5'
                }`}
                aria-label={`Go to banner ${index + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
