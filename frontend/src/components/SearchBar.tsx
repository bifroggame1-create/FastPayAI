'use client'

import { useAppStore } from '@/lib/store'
import { useState } from 'react'
import CatalogModal from './CatalogModal'

export default function SearchBar() {
  const { searchQuery, setSearchQuery } = useAppStore()
  const [isCatalogOpen, setIsCatalogOpen] = useState(false)

  return (
    <>
      <div className="px-4 py-3 sticky top-[57px] bg-light-bg dark:bg-dark-bg z-30">
        <div className="flex items-center gap-2">
          {/* Logo */}
          <img
            src="/logo.svg"
            alt="FastPay"
            className="h-16 w-auto object-contain flex-shrink-0"
          />

          {/* Catalog Button */}
          <button
            onClick={() => setIsCatalogOpen(!isCatalogOpen)}
            className="flex items-center gap-2 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white px-4 py-3 rounded-lg font-medium transition-all flex-shrink-0"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M4 4h7v7H4V4zm0 9h7v7H4v-7zm9-9h7v7h-7V4zm0 9h7v7h-7v-7z" />
            </svg>
            <span className="hidden sm:inline">Каталог</span>
          </button>

          {/* Search Input */}
          <div className="relative flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск по товарам"
              className="w-full bg-light-card dark:bg-dark-card text-light-text dark:text-dark-text px-4 py-3 pr-10 rounded-lg border border-light-border dark:border-dark-border focus:outline-none focus:ring-2 focus:ring-accent-cyan"
            />
            <svg
              className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-light-text-secondary dark:text-dark-text-secondary"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
        </div>
      </div>

      <CatalogModal isOpen={isCatalogOpen} onClose={() => setIsCatalogOpen(false)} />
    </>
  )
}
