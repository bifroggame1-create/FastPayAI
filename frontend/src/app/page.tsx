'use client'

import { useEffect, useState } from 'react'
import Header from '@/components/Header'
import SearchBar from '@/components/SearchBar'
import CategoryFilter from '@/components/CategoryFilter'
import ProductCard from '@/components/ProductCard'
import BottomNav from '@/components/BottomNav'
import FirstTimeOnboarding from '@/components/FirstTimeOnboarding'
import { ProductGridSkeleton } from '@/components/Skeleton'
import { Product, SortType } from '@/types'
import { productsApi } from '@/lib/api'
import { useAppStore } from '@/lib/store'

/**
 * Homepage - Clean, minimal marketplace
 *
 * Design:
 * - Dark theme only (fintech aesthetic)
 * - Minimal header with protection indicator
 * - Clean product grid
 * - No visual noise
 */

const sortOptions: { value: SortType; label: { ru: string; en: string } }[] = [
  { value: 'popular', label: { ru: 'Популярные', en: 'Popular' } },
  { value: 'newest', label: { ru: 'Новые', en: 'Newest' } },
  { value: 'price_asc', label: { ru: 'Цена', en: 'Price' } },
]

export default function MarketPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [sortBy, setSortBy] = useState<SortType>('popular')
  const { selectedCategory, searchQuery, language } = useAppStore()

  useEffect(() => {
    loadProducts()
  }, [selectedCategory, searchQuery, sortBy])

  const loadProducts = async () => {
    try {
      setLoading(true)
      const params: any = { sort: sortBy }
      if (selectedCategory !== 'all') params.category = selectedCategory
      if (searchQuery) params.search = searchQuery

      const data = await productsApi.getAll(params)
      setProducts(data)
    } catch (error) {
      console.error('Error loading products:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0D0D0F] pb-20">
      {/* Minimal header */}
      <div className="sticky top-0 z-20 bg-[#0D0D0F]/95 backdrop-blur-sm border-b border-[#2A2A30]">
        <div className="flex items-center justify-between h-14 px-4">
          <h1 className="text-lg font-semibold text-white">FastPay</h1>
          <div className="flex items-center gap-2 text-xs text-[#A0A0A8]">
            <svg className="w-4 h-4 text-[#00D4AA]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span>{language === 'ru' ? 'Защита покупателя' : 'Buyer protection'}</span>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="px-4 py-4">
        <SearchBar />
      </div>

      {/* Categories */}
      <CategoryFilter />

      {/* Products section */}
      <div className="px-4 pt-2 pb-4">
        {/* Section header with sort pills */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm text-[#5C5C66]">
            {products.length} {language === 'ru' ? 'товаров' : 'products'}
          </span>

          {/* Sort pills */}
          <div className="flex gap-1">
            {sortOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setSortBy(option.value)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  sortBy === option.value
                    ? 'bg-[#00D4AA] text-[#0D0D0F]'
                    : 'bg-[#16161A] text-[#A0A0A8] border border-[#2A2A30]'
                }`}
              >
                {option.label[language]}
              </button>
            ))}
          </div>
        </div>

        {/* Product grid */}
        {loading ? (
          <ProductGridSkeleton count={4} />
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {products.map((product) => (
              <ProductCard key={product._id} product={product} />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && products.length === 0 && (
          <div className="text-center py-20">
            <p className="text-[#5C5C66]">
              {language === 'ru' ? 'Товары не найдены' : 'No products found'}
            </p>
          </div>
        )}
      </div>

      {/* First time onboarding */}
      <FirstTimeOnboarding />

      <BottomNav />
    </div>
  )
}
