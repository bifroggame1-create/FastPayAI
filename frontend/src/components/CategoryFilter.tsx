'use client'

import { useAppStore } from '@/lib/store'

const categories = [
  { id: 'all', name: 'Все' },
  { id: 'ai-subscriptions', name: 'AI Подписки' },
  { id: 'vpn', name: 'VPN' },
  { id: 'streaming', name: 'Стриминг' },
  { id: 'gaming', name: 'Игры' },
  { id: 'software', name: 'ПО' },
  { id: 'education', name: 'Обучение' },
]

export default function CategoryFilter() {
  const { selectedCategory, setSelectedCategory } = useAppStore()

  return (
    <div className="flex gap-2 overflow-x-auto scrollbar-hide px-4 py-3">
      <button className="flex items-center gap-2 px-4 py-2 bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border rounded-full whitespace-nowrap hover:bg-light-border dark:hover:bg-dark-border transition-colors">
        <svg className="w-4 h-4 text-accent-cyan" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      </button>
      {categories.map((category) => (
        <button
          key={category.id}
          onClick={() => setSelectedCategory(category.id)}
          className={`px-4 py-2 rounded-full whitespace-nowrap transition-colors ${
            selectedCategory === category.id
              ? 'bg-accent-cyan text-black dark:text-white'
              : 'bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border text-light-text dark:text-dark-text hover:bg-light-border dark:hover:bg-dark-border'
          }`}
        >
          {category.name}
        </button>
      ))}
    </div>
  )
}
