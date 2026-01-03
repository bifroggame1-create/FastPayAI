'use client'

import { useAppStore } from '@/lib/store'
import { useState, useEffect, useRef } from 'react'
import CatalogModal from './CatalogModal'
import api from '@/lib/api'
import { t } from '@/lib/i18n'

export default function SearchBar() {
  const { searchQuery, setSearchQuery, language } = useAppStore()
  const [isCatalogOpen, setIsCatalogOpen] = useState(false)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [activeSuggestion, setActiveSuggestion] = useState(-1)
  const searchRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (searchQuery.length >= 2) {
        try {
          const { data } = await api.get('/products/search/suggestions', {
            params: { query: searchQuery }
          })
          setSuggestions(data)
          setShowSuggestions(true)
        } catch (error) {
          console.error('Error fetching suggestions:', error)
        }
      } else {
        setSuggestions([])
        setShowSuggestions(false)
      }
    }

    const debounce = setTimeout(fetchSuggestions, 300)
    return () => clearTimeout(debounce)
  }, [searchQuery])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveSuggestion(prev => (prev < suggestions.length - 1 ? prev + 1 : prev))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveSuggestion(prev => (prev > 0 ? prev - 1 : -1))
    } else if (e.key === 'Enter' && activeSuggestion >= 0) {
      e.preventDefault()
      selectSuggestion(suggestions[activeSuggestion])
    } else if (e.key === 'Escape') {
      setShowSuggestions(false)
    }
  }

  const selectSuggestion = (suggestion: string) => {
    setSearchQuery(suggestion)
    setShowSuggestions(false)
    setActiveSuggestion(-1)
  }

  return (
    <>
      <div className="px-4 py-3 sticky top-14 bg-tg-bg z-30">
        <div className="flex items-center gap-2">
          {/* Catalog Button */}
          <button
            onClick={() => setIsCatalogOpen(!isCatalogOpen)}
            aria-label={language === 'ru' ? 'Открыть каталог' : 'Open catalog'}
            aria-expanded={isCatalogOpen}
            className="flex items-center justify-center h-11 w-11 bg-tg-button text-white rounded-tg-sm active:opacity-80 transition-opacity flex-shrink-0"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M4 4h7v7H4V4zm0 9h7v7H4v-7zm9-9h7v7h-7V4zm0 9h7v7h-7v-7z" />
            </svg>
          </button>

          {/* Search Input */}
          <div ref={searchRef} className="relative flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
              placeholder={t('searchPlaceholder', language)}
              aria-label={language === 'ru' ? 'Поиск товаров' : 'Search products'}
              aria-autocomplete="list"
              aria-expanded={showSuggestions && suggestions.length > 0}
              className="w-full bg-tg-secondary-bg text-tg-text px-4 py-3 pr-10 rounded-tg-sm border-none focus:outline-none focus:ring-2 focus:ring-tg-button/50 placeholder:text-tg-hint text-[15px]"
            />
            <svg
              className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-tg-hint pointer-events-none"
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

            {/* Suggestions Dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-tg-secondary-bg rounded-tg shadow-lg overflow-hidden z-50">
                {suggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => selectSuggestion(suggestion)}
                    className={`w-full text-left px-4 py-3 active:bg-white/5 transition-colors ${
                      index === activeSuggestion ? 'bg-white/5' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <svg className="w-4 h-4 text-tg-hint" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      <span className="text-tg-text text-[15px]">{suggestion}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <CatalogModal isOpen={isCatalogOpen} onClose={() => setIsCatalogOpen(false)} />
    </>
  )
}
