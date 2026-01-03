'use client'

import { useAppStore } from '@/lib/store'
import { t } from '@/lib/i18n'
import { hapticImpact } from '@/lib/telegram'

const categories = [
  { id: 'all', nameKey: 'all' as const },
  { id: 'ai-subscriptions', nameKey: 'ai' as const },
  { id: 'vpn', nameKey: 'vpn' as const },
  { id: 'streaming', nameKey: 'streaming' as const },
  { id: 'gaming', nameKey: 'gaming' as const },
  { id: 'software', nameKey: 'software' as const },
  { id: 'education', nameKey: 'other' as const },
]

export default function CategoryFilter() {
  const { selectedCategory, setSelectedCategory, language } = useAppStore()

  const handleSelect = (id: string) => {
    hapticImpact('light')
    setSelectedCategory(id)
  }

  return (
    <div className="flex gap-2 overflow-x-auto scrollbar-hide px-4 py-2">
      {categories.map((category) => (
        <button
          key={category.id}
          onClick={() => handleSelect(category.id)}
          className={`px-4 py-2 rounded-full whitespace-nowrap text-[13px] font-medium transition-colors active:scale-95 ${
            selectedCategory === category.id
              ? 'bg-tg-button text-white'
              : 'bg-tg-secondary-bg text-tg-text'
          }`}
        >
          {t(category.nameKey, language)}
        </button>
      ))}
    </div>
  )
}
