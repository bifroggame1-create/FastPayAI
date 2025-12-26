'use client'

import { useAppStore } from '@/lib/store'

const filters = [
  { id: 'all' as const, name: 'Все' },
  { id: 'new' as const, name: 'Новые' },
  { id: 'used' as const, name: 'Б/У' },
]

export default function FilterTabs() {
  const { selectedFilter, setSelectedFilter } = useAppStore()

  return (
    <div className="flex gap-2 px-4 py-3">
      {filters.map((filter) => (
        <button
          key={filter.id}
          onClick={() => setSelectedFilter(filter.id)}
          className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
            selectedFilter === filter.id
              ? 'bg-gray-600 dark:bg-gray-600 text-white'
              : 'bg-light-card dark:bg-dark-card text-light-text-secondary dark:text-dark-text-secondary border border-light-border dark:border-dark-border'
          }`}
        >
          {filter.name}
        </button>
      ))}
    </div>
  )
}
