'use client'

import { useEffect, useState } from 'react'
import Header from '@/components/Header'
import SearchBar from '@/components/SearchBar'
import CategoryFilter from '@/components/CategoryFilter'
import ProductCard from '@/components/ProductCard'
import BottomNav from '@/components/BottomNav'
import PopularServices from '@/components/PopularServices'
import { ProductGridSkeleton } from '@/components/Skeleton'
import { Product, SortType } from '@/types'
import { productsApi } from '@/lib/api'
import { useAppStore } from '@/lib/store'
import { t } from '@/lib/i18n'

const sortOptions: { value: SortType; label: { ru: string; en: string } }[] = [
  { value: 'popular', label: { ru: 'Популярные', en: 'Popular' } },
  { value: 'newest', label: { ru: 'Новые', en: 'Newest' } },
  { value: 'price_asc', label: { ru: 'Дешевле', en: 'Price: Low' } },
  { value: 'price_desc', label: { ru: 'Дороже', en: 'Price: High' } },
  { value: 'rating', label: { ru: 'По рейтингу', en: 'Top Rated' } }
]

export default function MarketPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [sortBy, setSortBy] = useState<SortType>('popular')
  const [showSortMenu, setShowSortMenu] = useState(false)
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

  const currentSortLabel = sortOptions.find(o => o.value === sortBy)?.label[language] || sortOptions[0].label[language]

  return (
    <div className="min-h-screen bg-tg-bg pb-16">
      <Header />
      <SearchBar />
      <CategoryFilter />
      <PopularServices />

      <div id="products-section" className="px-4 py-4">
        {/* Section header with sorting */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[17px] font-semibold text-tg-text">
            {t('forYou', language)} <span className="text-tg-hint font-normal">{products.length}</span>
          </h2>

          {/* Sort dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowSortMenu(!showSortMenu)}
              className="flex items-center gap-1.5 px-3 py-2 bg-tg-secondary-bg rounded-tg-sm text-[13px] text-tg-text active:opacity-80"
            >
              <svg className="w-4 h-4 text-tg-hint" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
              </svg>
              <span>{currentSortLabel}</span>
              <svg className={`w-4 h-4 transition-transform ${showSortMenu ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showSortMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowSortMenu(false)} />
                <div className="absolute right-0 top-full mt-2 z-20 w-44 bg-tg-secondary-bg rounded-tg shadow-lg overflow-hidden">
                  {sortOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => {
                        setSortBy(option.value)
                        setShowSortMenu(false)
                      }}
                      className={`w-full px-4 py-3 text-left text-[15px] transition-colors active:bg-white/5 ${
                        sortBy === option.value
                          ? 'text-tg-accent font-medium'
                          : 'text-tg-text'
                      }`}
                    >
                      {option.label[language]}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {loading ? (
          <ProductGridSkeleton count={4} />
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {products.map((product) => (
              <ProductCard key={product._id} product={product} />
            ))}
          </div>
        )}

        {!loading && products.length === 0 && (
          <div className="text-center py-20">
            <div className="w-16 h-16 mx-auto mb-4 bg-tg-secondary-bg rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-tg-hint" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <p className="text-tg-hint text-[15px]">{t('noProducts', language)}</p>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  )
}
