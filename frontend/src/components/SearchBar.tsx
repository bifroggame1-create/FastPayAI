'use client'

import { useAppStore } from '@/lib/store'

/**
 * SearchBar - Minimal search input
 *
 * Design: Clean, no logo, no catalog button
 */
export default function SearchBar() {
  const { searchQuery, setSearchQuery, language } = useAppStore()

  return (
    <div className="relative">
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder={language === 'ru' ? 'Поиск товаров...' : 'Search products...'}
        className="w-full bg-[#16161A] text-white placeholder-[#5C5C66] px-4 py-3 pr-10 rounded-xl border border-[#2A2A30] focus:outline-none focus:border-[#00D4AA] transition-colors"
      />
      <svg
        className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#5C5C66] pointer-events-none"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      </svg>
    </div>
  )
}
