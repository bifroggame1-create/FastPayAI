'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Header from '@/components/Header'
import ProductCard from '@/components/ProductCard'
import BottomNav from '@/components/BottomNav'
import { User, Product } from '@/types'
import { userApi, productsApi } from '@/lib/api'
import { format } from 'date-fns/format'
import { ru } from 'date-fns/locale/ru'

export default function SellerProfilePage() {
  const params = useParams()
  const router = useRouter()
  const [seller, setSeller] = useState<User | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadSellerData()
  }, [params.id])

  const loadSellerData = async () => {
    try {
      setLoading(true)
      const userData = await userApi.getById(params.id as string)
      setSeller(userData)

      // Load seller's products
      const productsData = await productsApi.getAll()
      const sellerProducts = productsData.filter(p => p.seller.id === params.id)
      setProducts(sellerProducts)

      // Reviews removed - using only product cards
    } catch (error) {
      console.error('Error loading seller data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent-cyan"></div>
      </div>
    )
  }

  if (!seller) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center">
        <p className="text-dark-text-secondary">Продавец не найден</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-dark-bg pb-20">
      <Header
        title="Профиль продавца"
        showBack
        onBack={() => router.back()}
        rightAction={
          <button className="flex items-center gap-2 text-dark-text-secondary">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
              />
            </svg>
          </button>
        }
      />

      <div className="px-4 py-6">
        {/* Seller Info Header */}
        <div className="flex items-start gap-4 mb-4">
          <img
            src={seller.avatar || '/default-avatar.png'}
            alt={seller.name}
            className="w-16 h-16 rounded-full"
          />
          <div className="flex-1">
            <div className="flex items-center gap-1.5 mb-1">
              <h2 className="text-xl font-semibold">{seller.name}</h2>
              {(seller as any).isVerified && (
                <svg className="w-5 h-5 text-blue-500 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  <path fillRule="evenodd" d="M8.603 3.799A4.49 4.49 0 0112 2.25c1.357 0 2.573.6 3.397 1.549a4.49 4.49 0 013.498 1.307 4.491 4.491 0 011.307 3.497A4.49 4.49 0 0121.75 12a4.49 4.49 0 01-1.549 3.397 4.491 4.491 0 01-1.307 3.497 4.491 4.491 0 01-3.497 1.307A4.49 4.49 0 0112 21.75a4.49 4.49 0 01-3.397-1.549 4.49 4.49 0 01-3.498-1.306 4.491 4.491 0 01-1.307-3.498A4.49 4.49 0 012.25 12c0-1.357.6-2.573 1.549-3.397a4.49 4.49 0 011.307-3.497 4.49 4.49 0 013.497-1.307zm7.007 6.387a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
                </svg>
              )}
            </div>
            <p className="text-sm text-dark-text-secondary mb-1">
              Продаёт с {format(new Date(seller.joinedAt), 'd MMMM yyyy', { locale: ru })}
            </p>
            <p className="text-sm text-accent-cyan">99.6% успешных заказов</p>
          </div>
          <button className="p-2">
            <svg className="w-6 h-6 text-accent-cyan" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
              />
            </svg>
          </button>
        </div>

        {/* Verified Badge */}
        <div className="flex items-center gap-2 text-sm text-dark-text-secondary mb-6">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Проверенный продавец</span>
        </div>

        {/* Stats Row */}
        <div className="flex items-center justify-between mb-6 text-center">
          <div>
            <div className="flex items-center justify-center gap-1 mb-1">
              <svg className="w-5 h-5 text-yellow-500 fill-current" viewBox="0 0 20 20">
                <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
              </svg>
              <span className="text-xl font-bold">{seller.stats.rating.toFixed(1)}</span>
            </div>
            <p className="text-xs text-dark-text-secondary">{seller.stats.reviewsCount} отзывов</p>
          </div>

          <div>
            <div className="flex items-center justify-center gap-1 mb-1">
              <svg className="w-5 h-5 text-dark-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              <span className="text-xl font-bold">1679</span>
            </div>
            <p className="text-xs text-dark-text-secondary">заказов</p>
          </div>

          <div>
            <div className="flex items-center justify-center gap-1 mb-1">
              <svg className="w-5 h-5 text-dark-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
              </svg>
              <span className="text-xl font-bold">{seller.stats.returnsCount}</span>
            </div>
            <p className="text-xs text-dark-text-secondary">возвратов</p>
          </div>

          <div>
            <div className="flex items-center justify-center gap-1 mb-1">
              <svg className="w-5 h-5 text-pink-500 fill-current" viewBox="0 0 24 24">
                <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              <span className="text-xl font-bold">-</span>
            </div>
            <p className="text-xs text-dark-text-secondary">Нравится</p>
          </div>
        </div>

        {/* Seller's Products */}
        <div>
          <h3 className="text-lg font-semibold mb-4">{seller.name} продаёт</h3>

          {products.length > 0 ? (
            <div className="grid grid-cols-2 gap-3">
              {products.map((product) => (
                <ProductCard key={product._id} product={product} />
              ))}
            </div>
          ) : (
            <div className="text-center py-10">
              <p className="text-dark-text-secondary">У этого продавца пока нет товаров</p>
            </div>
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  )
}
