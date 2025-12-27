'use client'

import { useEffect, useState } from 'react'
import Header from '@/components/Header'
import SearchBar from '@/components/SearchBar'
import CategoryFilter from '@/components/CategoryFilter'
import ProductCard from '@/components/ProductCard'
import BottomNav from '@/components/BottomNav'
import ThemeToggle from '@/components/ThemeToggle'
import PopularServices from '@/components/PopularServices'
import { Product } from '@/types'
import { productsApi } from '@/lib/api'
import { useAppStore } from '@/lib/store'
import { t } from '@/lib/i18n'

export default function MarketPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const { selectedCategory, searchQuery, language } = useAppStore()

  useEffect(() => {
    loadProducts()
  }, [selectedCategory, searchQuery])

  const loadProducts = async () => {
    try {
      setLoading(true)
      const params: any = {}
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
    <div className="min-h-screen bg-light-bg dark:bg-dark-bg pb-20">
      <Header
        rightAction={<ThemeToggle />}
      />

      <SearchBar />
      <CategoryFilter />
      <PopularServices />

      <div id="products-section" className="px-4 py-4">
        <h2 className="text-lg font-semibold mb-4 text-light-text dark:text-dark-text">
          {t('forYou', language)} <span className="text-light-text-secondary dark:text-dark-text-secondary text-base">{products.length}</span>
        </h2>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent-cyan"></div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {products.map((product) => (
              <ProductCard key={product._id} product={product} />
            ))}
          </div>
        )}

        {!loading && products.length === 0 && (
          <div className="text-center py-20">
            <p className="text-light-text-secondary dark:text-dark-text-secondary">{t('noProducts', language)}</p>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  )
}
