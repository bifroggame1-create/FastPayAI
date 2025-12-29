'use client'

import { useAppStore } from '@/lib/store'

const categories = [
  { id: 'all', name: { ru: 'Все', en: 'All' } },
  { id: 'ai-subscriptions', name: { ru: 'AI', en: 'AI' } },
  { id: 'vpn', name: { ru: 'VPN', en: 'VPN' } },
  { id: 'streaming', name: { ru: 'Стриминг', en: 'Streaming' } },
  { id: 'gaming', name: { ru: 'Игры', en: 'Gaming' } },
  { id: 'software', name: { ru: 'Софт', en: 'Software' } },
]

export default function CategoryFilter() {
  const { selectedCategory, setSelectedCategory, language } = useAppStore()

  return (
    <div className="flex gap-2 overflow-x-auto scrollbar-hide px-4 pb-4">
      {categories.map((category) => (
        <button
          key={category.id}
          onClick={() => setSelectedCategory(category.id)}
          className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
            selectedCategory === category.id
              ? 'bg-[#00D4AA] text-[#0D0D0F]'
              : 'bg-[#16161A] text-[#A0A0A8] border border-[#2A2A30] hover:border-[#3A3A40]'
          }`}
        >
          {category.name[language]}
        </button>
      ))}
    </div>
  )
}
