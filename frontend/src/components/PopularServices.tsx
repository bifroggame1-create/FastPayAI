'use client'

import { useAppStore } from '@/lib/store'
import { hapticImpact } from '@/lib/telegram'

const popularServices = [
  { id: 'gaming', name: 'Steam', image: '/brands/steam.webp' },
  { id: 'gaming', name: 'PlayStation', image: '/brands/Platstation.webp' },
  { id: 'gaming', name: 'Xbox', image: '/brands/xbox.webp' },
  { id: 'streaming', name: 'App Store', image: '/brands/apple.webp' },
  { id: 'ai-subscriptions', name: 'Claude AI', image: '/brands/claude.webp' },
  { id: 'ai-subscriptions', name: 'ChatGPT', image: '/brands/openai.webp' },
  { id: 'streaming', name: 'Spotify', image: '/brands/spotify.webp' },
  { id: 'vpn', name: 'VPN', image: '/brands/nord.webp' },
  { id: 'software', name: 'Adobe', image: '/brands/adobe.webp' },
  { id: 'ai-subscriptions', name: 'Gemini', image: '/brands/gemini.webp' },
]

export default function PopularServices() {
  const { setSelectedCategory, language } = useAppStore()

  const handleServiceClick = (categoryId: string) => {
    hapticImpact('light')
    setSelectedCategory(categoryId)
    // Scroll to products section (with SSR guard)
    if (typeof document !== 'undefined') {
      const productsSection = document.getElementById('products-section')
      if (productsSection) {
        productsSection.scrollIntoView({ behavior: 'smooth' })
      }
    }
  }

  return (
    <div className="px-4 py-4">
      <h2 className="text-[17px] font-semibold text-tg-text mb-3">
        {language === 'ru' ? 'Популярное' : 'Popular'}
      </h2>
      <div className="grid grid-cols-5 gap-2">
        {popularServices.map((service) => (
          <button
            key={`${service.id}-${service.name}`}
            onClick={() => handleServiceClick(service.id)}
            className="flex flex-col items-center gap-1.5 active:scale-95 transition-transform"
          >
            <div className="w-full aspect-square rounded-xl overflow-hidden bg-tg-secondary-bg p-2">
              <img
                src={service.image}
                alt={service.name}
                className="w-full h-full object-contain"
              />
            </div>
            <span className="text-[11px] text-center text-tg-text font-medium line-clamp-1">
              {service.name}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
